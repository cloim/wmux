export type CwdPlatform =
  | 'aix'
  | 'android'
  | 'cygwin'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'netbsd'
  | 'openbsd'
  | 'sunos'
  | 'win32';

function decodeCwd(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeStoredCwd(cwd: string | undefined): string | undefined {
  const value = cwd?.trim();
  if (!value) return undefined;

  const decoded = decodeCwd(value);
  if (/^\/[A-Za-z]:[\\/]/.test(decoded)) {
    return decoded.slice(1).replace(/\//g, '\\');
  }
  return decoded;
}

export function normalizeOsc7Cwd(data: string, platform: CwdPlatform): string {
  let cwd = data;

  if (cwd.startsWith('file://')) {
    const withoutScheme = cwd.slice('file://'.length);
    if (withoutScheme.startsWith('/')) {
      cwd = withoutScheme;
    } else {
      const slashIndex = withoutScheme.indexOf('/');
      cwd = slashIndex === -1 ? withoutScheme : withoutScheme.slice(slashIndex);
    }
  }

  cwd = decodeCwd(cwd);

  if (platform === 'win32' || /^\/[A-Za-z]:[\\/]/.test(cwd)) {
    if (/^\/[A-Za-z]:[\\/]/.test(cwd)) {
      cwd = cwd.slice(1);
    }
    return cwd.replace(/\//g, '\\');
  }

  return cwd;
}
