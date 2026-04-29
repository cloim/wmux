import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HELPER_EXE = 'wmux-console-input.exe';
const BRACKETED_PASTE_PREFIX = '\x1b[200~';
const BRACKETED_PASTE_SUFFIX = '\x1b[201~';
const SHIFT_ENTER_KEY_EVENT = '\x1b[13;2u';
const MAX_NATIVE_INPUT_LENGTH = 4096;

export type Win32NativeInput =
  | { kind: 'text'; text: string }
  | { kind: 'shiftEnter' };

export function getWin32NativeInput(data: string): Win32NativeInput | null {
  if (process.platform !== 'win32') return null;
  if (data === SHIFT_ENTER_KEY_EVENT) return { kind: 'shiftEnter' };

  const text = getWin32NativeInputText(data);
  return text ? { kind: 'text', text } : null;
}

export function getWin32NativeInputText(data: string): string | null {
  if (process.platform !== 'win32') return null;
  if (data.length === 0 || data.length > MAX_NATIVE_INPUT_LENGTH) return null;

  const bracketed = unwrapBracketedPaste(data);
  const text = bracketed ?? data;
  if (!hasNonAscii(text)) return null;
  if (!isConsoleTextInput(text)) return null;
  return text;
}

export function writePtyInputWithWin32Fallback(
  pid: number,
  data: string,
  writePty: (data: string) => void,
): void {
  const nativeInput = getWin32NativeInput(data);
  if (nativeInput && tryWriteWin32ConsoleInput(pid, nativeInput)) {
    return;
  }
  writePty(data);
}

export function tryWriteWin32ConsoleInput(pid: number, input: Win32NativeInput): boolean {
  if (process.platform !== 'win32') return false;
  if (!Number.isInteger(pid) || pid <= 0) return false;

  const helper = resolveWin32ConsoleInputHelper();
  if (!helper) return false;

  const args = input.kind === 'shiftEnter'
    ? ['--pid', String(pid), '--shift-enter']
    : [
        '--pid',
        String(pid),
        '--utf16-base64',
        Buffer.from(input.text, 'utf16le').toString('base64'),
      ];

  try {
    execFileSync(helper, args, {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 2000,
    });
    return true;
  } catch {
    return false;
  }
}

export function resolveWin32ConsoleInputHelper(): string | null {
  if (process.platform !== 'win32') return null;

  const candidates = new Set<string>();
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    candidates.add(path.join(resourcesPath, 'native', HELPER_EXE));
  }

  candidates.add(path.resolve(process.cwd(), 'dist', 'native', HELPER_EXE));
  candidates.add(path.resolve(__dirname, '..', 'native', HELPER_EXE));
  candidates.add(path.resolve(__dirname, '..', '..', 'dist', 'native', HELPER_EXE));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function unwrapBracketedPaste(data: string): string | null {
  if (!data.startsWith(BRACKETED_PASTE_PREFIX)) return null;
  if (!data.endsWith(BRACKETED_PASTE_SUFFIX)) return null;
  return data.slice(BRACKETED_PASTE_PREFIX.length, -BRACKETED_PASTE_SUFFIX.length);
}

function hasNonAscii(data: string): boolean {
  for (let i = 0; i < data.length; i++) {
    if (data.charCodeAt(i) > 0x7f) return true;
  }
  return false;
}

function isConsoleTextInput(data: string): boolean {
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    if (code === 0x09 || code === 0x0a || code === 0x0d) continue;
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}
