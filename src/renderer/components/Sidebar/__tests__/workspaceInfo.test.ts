import { describe, expect, it } from 'vitest';
import { createSurface, createWorkspace } from '../../../../shared/types';
import { buildWorkspaceInfoLines } from '../workspaceInfo';

describe('workspace info clipboard output', () => {
  it('uses each terminal surface cwd before workspace metadata cwd', () => {
    const workspace = createWorkspace('Workspace 1');
    if (workspace.rootPane.type !== 'leaf') throw new Error('expected leaf pane');

    workspace.metadata = { cwd: 'D:\\PROJECTS\\global' };
    workspace.rootPane.surfaces = [
      createSurface('pty-1', 'pwsh', 'D:\\PROJECTS\\wmux'),
      createSurface('pty-2', 'pwsh', 'D:\\PROJECTS\\other'),
    ];
    workspace.rootPane.activeSurfaceId = workspace.rootPane.surfaces[0].id;

    const lines = buildWorkspaceInfoLines(workspace);

    expect(lines).toContain('   - CWD: D:\\PROJECTS\\wmux');
    expect(lines).toContain('   - CWD: D:\\PROJECTS\\other');
    expect(lines).not.toContain('   - CWD: D:\\PROJECTS\\global');
  });
});
