import { describe, expect, it } from 'vitest';
import { createSurface, type Pane, type Workspace } from '../../../shared/types';
import { findWorkspaceIdByPtyId } from '../workspacePty';

function leaf(id: string, ptyId: string): Pane {
  const surface = createSurface(ptyId, 'pwsh', 'D:\\PROJECTS\\wmux');
  return {
    id,
    type: 'leaf',
    surfaces: [surface],
    activeSurfaceId: surface.id,
  };
}

function workspace(id: string, rootPane: Pane): Workspace {
  return {
    id,
    name: id,
    rootPane,
    activePaneId: rootPane.type === 'leaf' ? rootPane.id : 'pane-left',
  };
}

describe('findWorkspaceIdByPtyId', () => {
  it('returns the owning workspace for a nested pane surface pty', () => {
    const wsA = workspace('ws-a', leaf('pane-a', 'pty-a'));
    const wsB = workspace('ws-b', {
      id: 'root-b',
      type: 'branch',
      direction: 'horizontal',
      children: [
        leaf('pane-left', 'pty-b-left'),
        leaf('pane-right', 'pty-b-right'),
      ],
    });

    expect(findWorkspaceIdByPtyId([wsA, wsB], 'pty-b-right')).toBe('ws-b');
  });

  it('returns null when no workspace owns the pty', () => {
    const wsA = workspace('ws-a', leaf('pane-a', 'pty-a'));

    expect(findWorkspaceIdByPtyId([wsA], 'missing')).toBeNull();
  });
});
