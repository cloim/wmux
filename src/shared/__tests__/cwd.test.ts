import { describe, expect, it } from 'vitest';
import { normalizeOsc7Cwd, normalizeStoredCwd } from '../cwd';

describe('cwd normalization', () => {
  it('normalizes Windows OSC 7 file URIs with a hostname to a valid drive path', () => {
    expect(normalizeOsc7Cwd('file://MYPC/D:/PROJECTS/wmux', 'win32')).toBe('D:\\PROJECTS\\wmux');
  });

  it('normalizes Windows OSC 7 file URIs without a hostname to a valid drive path', () => {
    expect(normalizeOsc7Cwd('file:///D:/PROJECTS/wmux', 'win32')).toBe('D:\\PROJECTS\\wmux');
  });

  it('keeps POSIX OSC 7 paths host-stripped', () => {
    expect(normalizeOsc7Cwd('file://myhost/home/user/project', 'linux')).toBe('/home/user/project');
  });

  it('repairs legacy saved Windows cwd values that start with a slash before the drive', () => {
    expect(normalizeStoredCwd('/D:/PROJECTS/wmux')).toBe('D:\\PROJECTS\\wmux');
  });
});
