const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

if (process.platform !== 'win32') {
  console.log('[build-win32-console-input] Skipped: not Windows.');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src', 'native', 'win32-console-input', 'WmuxConsoleInput.cs');
const outDir = path.join(root, 'dist', 'native');
const output = path.join(outDir, 'wmux-console-input.exe');
const windir = process.env.WINDIR || process.env.SystemRoot || 'C:\\Windows';
const candidates = [
  path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
];
const csc = candidates.find((candidate) => fs.existsSync(candidate));

if (!csc) {
  throw new Error(`csc.exe not found. Checked: ${candidates.join(', ')}`);
}

fs.mkdirSync(outDir, { recursive: true });
execFileSync(csc, [
  '/nologo',
  '/target:exe',
  '/platform:anycpu',
  '/optimize+',
  `/out:${output}`,
  source,
], { stdio: 'inherit', windowsHide: true });

console.log(`[build-win32-console-input] Built ${path.relative(root, output)}`);
