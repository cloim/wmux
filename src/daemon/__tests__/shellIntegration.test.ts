import { beforeEach, describe, expect, it, vi } from 'vitest';

const writes = new Map<string, string>();

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn((filePath: string, content: string) => {
      writes.set(filePath, content);
    }),
  },
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn((filePath: string, content: string) => {
    writes.set(filePath, content);
  }),
}));

vi.mock('../config', () => ({
  getWmuxDir: () => 'C:\\Users\\test\\.wmux',
}));

import { installShellIntegration } from '../shell-integration';

function writtenFile(name: string): string {
  const entry = [...writes.entries()].find(([filePath]) => filePath.endsWith(name));
  if (!entry) throw new Error(`expected ${name} to be written`);
  return entry[1];
}

describe('shell integration scripts', () => {
  beforeEach(() => {
    writes.clear();
  });

  it('reports cwd from the daemon PowerShell prompt hook', () => {
    installShellIntegration();

    const script = writtenFile('wmux-shell-init.ps1');

    expect(script).toContain('Get-Location');
    expect(script).toContain("$cwdUri = 'file://' + $hostName + '/' + ($cwd -replace '\\\\', '/')");
    expect(script).toContain(']7;');
    expect(script).toContain('file://');
  });

  it('reports cwd from the daemon Bash prompt hook', () => {
    installShellIntegration();

    const script = writtenFile('wmux-shell-init.bash');

    expect(script).toContain('$PWD');
    expect(script).toContain(']7;file://');
  });
});
