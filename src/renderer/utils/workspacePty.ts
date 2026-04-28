import type { Pane, Workspace } from '../../shared/types';

function paneHasPtyId(pane: Pane, ptyId: string): boolean {
  if (pane.type === 'leaf') {
    return pane.surfaces.some((surface) => surface.ptyId === ptyId);
  }

  return pane.children.some((child) => paneHasPtyId(child, ptyId));
}

export function findWorkspaceIdByPtyId(workspaces: Workspace[], ptyId: string): string | null {
  for (const workspace of workspaces) {
    if (paneHasPtyId(workspace.rootPane, ptyId)) return workspace.id;
  }

  return null;
}
