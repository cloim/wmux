import { describe, expect, it } from 'vitest';
import { getWin32NativeInput, getWin32NativeInputText } from '../win32ConsoleInput';

const describeWin32 = process.platform === 'win32' ? describe : describe.skip;

describeWin32('getWin32NativeInputText', () => {
  it('routes printable non-ASCII text through native console input', () => {
    expect(getWin32NativeInputText('abc→def')).toBe('abc→def');
  });

  it('unwraps bracketed paste when the pasted text needs native input', () => {
    expect(getWin32NativeInputText('\x1b[200~abc→def\x1b[201~')).toBe('abc→def');
  });

  it('keeps ASCII and ANSI control sequences on the normal PTY path', () => {
    expect(getWin32NativeInputText('abcdef')).toBeNull();
    expect(getWin32NativeInputText('\x1b[C')).toBeNull();
  });

  it('routes the Shift+Enter sentinel through native console key input', () => {
    expect(getWin32NativeInput('\x1b[13;2u')).toEqual({ kind: 'shiftEnter' });
  });
});
