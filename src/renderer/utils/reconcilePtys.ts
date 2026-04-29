import type { Pane, Workspace } from '../../shared/types';

export interface PtyReconcileTask {
  workspaceId: string;
  workspaceCwd?: string;
  paneId: string;
  surfaceId: string;
  ptyId: string;
  surfaceCwd?: string;
}

function collectFromPane(pane: Pane, workspace: Workspace, tasks: PtyReconcileTask[]): void {
  if (pane.type === 'leaf') {
    for (const surface of pane.surfaces) {
      if (surface.surfaceType === 'browser' || surface.surfaceType === 'editor') continue;
      if (!surface.ptyId) continue;

      tasks.push({
        workspaceId: workspace.id,
        workspaceCwd: workspace.metadata?.cwd,
        paneId: pane.id,
        surfaceId: surface.id,
        ptyId: surface.ptyId,
        surfaceCwd: surface.cwd,
      });
    }
    return;
  }

  for (const child of pane.children) {
    collectFromPane(child, workspace, tasks);
  }
}

export function collectPtyReconcileTasks(workspaces: Workspace[]): PtyReconcileTask[] {
  const tasks: PtyReconcileTask[] = [];
  for (const workspace of workspaces) {
    collectFromPane(workspace.rootPane, workspace, tasks);
  }
  return tasks;
}

export function collectStaleActivePtyIds(
  workspaces: Workspace[],
  activePtys: Array<{ id: string }>,
  additionalReferencedPtyIds: string[] = [],
): string[] {
  const referencedPtyIds = new Set([
    ...collectPtyReconcileTasks(workspaces).map((task) => task.ptyId),
    ...additionalReferencedPtyIds,
  ]);
  return activePtys.map((pty) => pty.id).filter((id) => !referencedPtyIds.has(id));
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];

  const concurrency = Math.max(1, Math.min(limit, items.length));
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        results[index] = {
          status: 'fulfilled',
          value: await worker(items[index], index),
        };
      } catch (reason) {
        results[index] = {
          status: 'rejected',
          reason,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  return results;
}
