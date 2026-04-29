import type { Pane, PaneLeaf } from '../../shared/types';

export function collectEmptyLeavesForInitialSurfaceRestore(
  sessionLoaded: boolean,
  pane: Pane,
): PaneLeaf[] {
  if (!sessionLoaded) return [];

  if (pane.type === 'leaf') {
    return pane.surfaces.length === 0 ? [pane] : [];
  }

  return pane.children.flatMap((child) => collectEmptyLeavesForInitialSurfaceRestore(true, child));
}

export function shouldReconcileOnDaemonConnected(sessionLoaded: boolean): boolean {
  return sessionLoaded;
}
