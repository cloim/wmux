import { describe, expect, it } from 'vitest';
import { createSurface, type Pane, type Workspace } from '../../../shared/types';
import { resolveNotificationTarget } from '../useNotificationListener';

function leafPane(id: string, ptyId: string): Pane {
  const surface = createSurface(ptyId, 'pwsh', 'D:\\PROJECTS\\wmux');
  return {
    id,
    type: 'leaf',
    surfaces: [surface],
    activeSurfaceId: surface.id,
  };
}

function workspace(id: string, ptyId: string): Workspace {
  const rootPane = leafPane(`pane-${id}`, ptyId);
  return {
    id,
    name: id,
    rootPane,
    activePaneId: rootPane.id,
  };
}

describe('useNotificationListener target resolution', () => {
  it('maps pty-scoped notifications to the owning workspace and surface', () => {
    const wsA = workspace('ws-a', 'pty-a');
    const wsB = workspace('ws-b', 'pty-b');

    expect(resolveNotificationTarget([wsA, wsB], 'ws-a', 'pty-b')).toEqual({
      workspaceId: 'ws-b',
      surfaceId: wsB.rootPane.type === 'leaf' ? wsB.rootPane.surfaces[0].id : '',
    });
  });

  it('maps global notifications without ptyId to the active workspace surface', () => {
    const wsA = workspace('ws-a', 'pty-a');
    const wsB = workspace('ws-b', 'pty-b');

    expect(resolveNotificationTarget([wsA, wsB], 'ws-b', null)).toEqual({
      workspaceId: 'ws-b',
      surfaceId: wsB.rootPane.type === 'leaf' ? wsB.rootPane.surfaces[0].id : '',
    });
  });
});
