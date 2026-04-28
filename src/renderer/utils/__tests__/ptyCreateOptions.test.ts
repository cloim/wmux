import { describe, expect, it } from 'vitest';
import { withDefaultCwd, withDefaultPtyOptions, withDefaultShell } from '../ptyCreateOptions';

describe('withDefaultShell', () => {
  it('uses the stored detected shell path when no shell is specified', () => {
    expect(withDefaultShell({ workspaceId: 'ws-1' }, 'C:\\Program Files\\PowerShell\\7\\pwsh.exe')).toEqual({
      workspaceId: 'ws-1',
      shell: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    });
  });

  it('keeps an explicitly requested shell', () => {
    expect(withDefaultShell({ shell: 'cmd.exe' }, 'C:\\Program Files\\PowerShell\\7\\pwsh.exe')).toEqual({
      shell: 'cmd.exe',
    });
  });

  it('does not pass legacy setting aliases as executable shell values', () => {
    expect(withDefaultShell({ workspaceId: 'ws-1' }, 'powershell')).toEqual({
      workspaceId: 'ws-1',
    });
  });
});

describe('withDefaultCwd', () => {
  it('uses the stored default cwd when no cwd is specified', () => {
    expect(withDefaultCwd({ workspaceId: 'ws-1' }, 'D:\\Code')).toEqual({
      workspaceId: 'ws-1',
      cwd: 'D:\\Code',
    });
  });

  it('keeps an explicitly requested cwd', () => {
    expect(withDefaultCwd({ cwd: 'D:\\Repo' }, 'D:\\Code')).toEqual({
      cwd: 'D:\\Repo',
    });
  });

  it('does not pass an empty default cwd so the main process keeps its home-directory fallback', () => {
    expect(withDefaultCwd({ workspaceId: 'ws-1' }, '')).toEqual({
      workspaceId: 'ws-1',
    });
  });
});

describe('withDefaultPtyOptions', () => {
  it('applies both default shell and default cwd', () => {
    expect(withDefaultPtyOptions(
      { workspaceId: 'ws-1' },
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'D:\\Code',
    )).toEqual({
      workspaceId: 'ws-1',
      shell: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      cwd: 'D:\\Code',
    });
  });
});
