import { describe, expect, it } from 'vitest';
import { resolveEmptyLeafCwd, resolveRestoredSurfaceCwd } from '../restoreCwd';
import type { Pane } from '../../../shared/types';

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

describe('resolveEmptyLeafCwd', () => {
  it('uses the cwd from the pane that was split before falling back to workspace metadata', () => {
    const root: Pane = {
      id: 'branch-1',
      type: 'branch',
      direction: 'horizontal',
      children: [
        {
          id: 'source-pane',
          type: 'leaf',
          activeSurfaceId: 'surface-1',
          surfaces: [
            {
              id: 'surface-1',
              ptyId: 'pty-1',
              title: 'Terminal',
              shell: 'pwsh',
              cwd: 'D:\\PROJECTS\\wmux\\src',
            },
          ],
        },
        {
          id: 'new-pane',
          type: 'leaf',
          activeSurfaceId: '',
          surfaces: [],
        },
      ],
    };

    expect(resolveEmptyLeafCwd(root, 'new-pane', 'D:\\PROJECTS\\wmux')).toBe('D:\\PROJECTS\\wmux\\src');
  });
});
