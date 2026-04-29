import { normalizeStoredCwd } from '../../shared/cwd';
import type { Pane, PaneLeaf, Surface } from '../../shared/types';

export function resolveRestoredSurfaceCwd(
  surfaceCwd: string | undefined,
  workspaceCwd: string | undefined,
): string | undefined {
  return normalizeStoredCwd(surfaceCwd) ?? normalizeStoredCwd(workspaceCwd);
}

function resolveSurfaceCwd(surface: Surface | undefined): string | undefined {
  return normalizeStoredCwd(surface?.cwd);
}

function resolveLeafCwd(leaf: PaneLeaf): string | undefined {
  const activeSurface = leaf.surfaces.find((surface) => surface.id === leaf.activeSurfaceId);
  const activeCwd = resolveSurfaceCwd(activeSurface);
  if (activeCwd) return activeCwd;

  for (const surface of leaf.surfaces) {
    const cwd = resolveSurfaceCwd(surface);
    if (cwd) return cwd;
  }

  return undefined;
}

function resolvePaneCwd(pane: Pane): string | undefined {
  if (pane.type === 'leaf') return resolveLeafCwd(pane);

  for (const child of pane.children) {
    const cwd = resolvePaneCwd(child);
    if (cwd) return cwd;
  }

  return undefined;
}

function findCwdNearLeaf(pane: Pane, leafId: string): { found: boolean; cwd?: string } {
  if (pane.type === 'leaf') {
    return { found: pane.id === leafId, cwd: pane.id === leafId ? resolveLeafCwd(pane) : undefined };
  }

  for (const child of pane.children) {
    const result = findCwdNearLeaf(child, leafId);
    if (!result.found) continue;

    if (result.cwd) return result;

    for (const sibling of pane.children) {
      if (sibling === child) continue;
      const siblingCwd = resolvePaneCwd(sibling);
      if (siblingCwd) return { found: true, cwd: siblingCwd };
    }

    return result;
  }

  return { found: false };
}

export function resolveEmptyLeafCwd(
  rootPane: Pane,
  leafId: string,
  workspaceCwd: string | undefined,
): string | undefined {
  return findCwdNearLeaf(rootPane, leafId).cwd ?? normalizeStoredCwd(workspaceCwd);
}
