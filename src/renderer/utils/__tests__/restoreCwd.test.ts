import { describe, expect, it } from 'vitest';
import { resolveRestoredSurfaceCwd } from '../restoreCwd';

describe('resolveRestoredSurfaceCwd', () => {
  it('uses workspace metadata cwd when the saved surface cwd is empty', () => {
    expect(resolveRestoredSurfaceCwd('', 'D:\\PROJECTS\\wmux')).toBe('D:\\PROJECTS\\wmux');
  });

  it('prefers the terminal surface cwd when it is present', () => {
    expect(resolveRestoredSurfaceCwd('D:\\PROJECTS\\wmux\\src', 'D:\\PROJECTS\\wmux')).toBe('D:\\PROJECTS\\wmux\\src');
  });

  it('repairs legacy slash-prefixed Windows drive cwd values before restore', () => {
    expect(resolveRestoredSurfaceCwd('/D:/PROJECTS/wmux', undefined)).toBe('D:\\PROJECTS\\wmux');
  });
});
