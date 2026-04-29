# Session Reconcile Concurrency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speed up terminal connection during session restore by replacing per-terminal serial reconciliation with bounded concurrent work.

**Architecture:** Extract reconciliation planning/execution helpers from `AppLayout.tsx` into a focused renderer utility. `AppLayout` will still own IPC calls and store updates, but it will build terminal reconciliation tasks and run them through a bounded concurrency runner so reconnect/create operations overlap safely.

**Tech Stack:** React 19, Electron IPC bridge, Zustand store, TypeScript, Vitest.

---

## File Structure

- Create: `src/renderer/utils/reconcilePtys.ts`
  - Owns pure helpers for collecting terminal surfaces and running async tasks with a concurrency limit.
  - Exposes `collectPtyReconcileTasks()` and `runWithConcurrency()`.
- Create: `src/renderer/utils/__tests__/reconcilePtys.test.ts`
  - Tests task collection, concurrency limiting, and failure isolation.
- Modify: `src/renderer/components/Layout/AppLayout.tsx`
  - Replace nested serial `await reconcile(...)` loops with task collection plus `runWithConcurrency(tasks, 4, runner)`.
  - Keep IPC/store behavior in `AppLayout` so the utility remains easy to test without Electron.

---

### Task 1: Add PTY reconciliation utility with task collection

**Files:**
- Create: `src/renderer/utils/reconcilePtys.ts`
- Create: `src/renderer/utils/__tests__/reconcilePtys.test.ts`

- [ ] **Step 1: Write the failing test for terminal task collection**

Create `src/renderer/utils/__tests__/reconcilePtys.test.ts` with this content:

```ts
import { describe, expect, it } from 'vitest';
import type { Pane, Workspace } from '../../../shared/types';
import { collectPtyReconcileTasks } from '../reconcilePtys';

function workspace(rootPane: Pane): Workspace {
  return {
    id: 'ws-1',
    name: 'Workspace 1',
    rootPane,
    activePaneId: rootPane.type === 'leaf' ? rootPane.id : 'pane-a',
    metadata: { cwd: 'D:\\PROJECTS\\wmux' },
  };
}

describe('collectPtyReconcileTasks', () => {
  it('collects only terminal surfaces with saved ptyIds', () => {
    const rootPane: Pane = {
      id: 'root',
      type: 'branch',
      direction: 'horizontal',
      children: [
        {
          id: 'pane-a',
          type: 'leaf',
          activeSurfaceId: 'surface-terminal',
          surfaces: [
            {
              id: 'surface-terminal',
              ptyId: 'pty-existing',
              title: 'pwsh',
              shell: 'pwsh',
              cwd: 'D:\\PROJECTS\\wmux\\src',
            },
            {
              id: 'surface-browser',
              ptyId: '',
              title: 'Browser',
              shell: '',
              cwd: '',
              surfaceType: 'browser',
              browserUrl: 'https://example.com',
            },
          ],
        },
        {
          id: 'pane-b',
          type: 'leaf',
          activeSurfaceId: 'surface-empty',
          surfaces: [
            {
              id: 'surface-empty',
              ptyId: '',
              title: 'Terminal',
              shell: 'pwsh',
              cwd: 'D:\\PROJECTS\\wmux',
            },
          ],
        },
      ],
    };

    expect(collectPtyReconcileTasks([workspace(rootPane)])).toEqual([
      {
        workspaceId: 'ws-1',
        workspaceCwd: 'D:\\PROJECTS\\wmux',
        paneId: 'pane-a',
        surfaceId: 'surface-terminal',
        ptyId: 'pty-existing',
        surfaceCwd: 'D:\\PROJECTS\\wmux\\src',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts
```

Expected: FAIL because `../reconcilePtys` does not exist or `collectPtyReconcileTasks` is not exported.

- [ ] **Step 3: Write minimal implementation**

Create `src/renderer/utils/reconcilePtys.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts
```

Expected: PASS, 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/utils/reconcilePtys.ts src/renderer/utils/__tests__/reconcilePtys.test.ts
git commit -m "test: add pty reconcile task collection"
```

---

### Task 2: Add bounded concurrency runner

**Files:**
- Modify: `src/renderer/utils/reconcilePtys.ts`
- Modify: `src/renderer/utils/__tests__/reconcilePtys.test.ts`

- [ ] **Step 1: Write failing tests for bounded concurrency and failure isolation**

Append these tests inside the existing `describe` block in `src/renderer/utils/__tests__/reconcilePtys.test.ts`:

```ts
  it('runs async work with the requested concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;
    const releaseNext: Array<() => void> = [];

    const promises = runWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise<void>((resolve) => releaseNext.push(resolve));
      running -= 1;
      return value * 2;
    });

    await Promise.resolve();
    expect(maxRunning).toBe(2);
    expect(releaseNext).toHaveLength(2);

    while (releaseNext.length > 0) {
      releaseNext.shift()?.();
      await Promise.resolve();
    }

    await expect(promises).resolves.toEqual([2, 4, 6, 8, 10]);
    expect(maxRunning).toBe(2);
  });

  it('continues remaining work when one task fails', async () => {
    const seen: number[] = [];

    const results = await runWithConcurrency([1, 2, 3], 2, async (value) => {
      seen.push(value);
      if (value === 2) throw new Error('boom');
      return value * 10;
    });

    expect(seen.sort()).toEqual([1, 2, 3]);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 10 });
    expect(results[1].status).toBe('rejected');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 30 });
  });
```

Also update the import at the top:

```ts
import { collectPtyReconcileTasks, runWithConcurrency } from '../reconcilePtys';
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts
```

Expected: FAIL because `runWithConcurrency` is not exported.

- [ ] **Step 3: Implement bounded concurrency runner**

Append this to `src/renderer/utils/reconcilePtys.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts
```

Expected: PASS, 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/utils/reconcilePtys.ts src/renderer/utils/__tests__/reconcilePtys.test.ts
git commit -m "feat: add bounded pty reconcile runner"
```

---

### Task 3: Use bounded reconciliation in AppLayout

**Files:**
- Modify: `src/renderer/components/Layout/AppLayout.tsx:251-312`
- Modify: `src/renderer/utils/__tests__/reconcilePtys.test.ts`

- [ ] **Step 1: Write failing behavior test for active/replacement decisions**

Append this test inside the existing `describe` block in `src/renderer/utils/__tests__/reconcilePtys.test.ts`:

```ts
  it('preserves enough task data to choose reconnect or replacement pty', () => {
    const rootPane: Pane = {
      id: 'pane-a',
      type: 'leaf',
      activeSurfaceId: 'surface-a',
      surfaces: [
        {
          id: 'surface-a',
          ptyId: 'pty-a',
          title: 'pwsh',
          shell: 'pwsh',
          cwd: 'D:\\PROJECTS\\wmux\\a',
        },
        {
          id: 'surface-b',
          ptyId: 'pty-b',
          title: 'pwsh',
          shell: 'pwsh',
          cwd: 'D:\\PROJECTS\\wmux\\b',
        },
      ],
    };

    const tasks = collectPtyReconcileTasks([workspace(rootPane)]);

    expect(tasks).toEqual([
      expect.objectContaining({ paneId: 'pane-a', surfaceId: 'surface-a', ptyId: 'pty-a', surfaceCwd: 'D:\\PROJECTS\\wmux\\a' }),
      expect.objectContaining({ paneId: 'pane-a', surfaceId: 'surface-b', ptyId: 'pty-b', surfaceCwd: 'D:\\PROJECTS\\wmux\\b' }),
    ]);
  });
```

This test verifies the helper exposes every identifier `AppLayout` needs when running tasks concurrently.

- [ ] **Step 2: Run test to verify it fails or confirms current helper coverage**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts
```

Expected: PASS if Task 1 already preserved these fields. If it fails, update `PtyReconcileTask` before modifying `AppLayout`.

- [ ] **Step 3: Modify imports in AppLayout**

In `src/renderer/components/Layout/AppLayout.tsx`, add this import:

```ts
import { collectPtyReconcileTasks, runWithConcurrency } from '../../utils/reconcilePtys';
```

Keep the existing `startupRestore` and `restoreCwd` imports unchanged.

- [ ] **Step 4: Replace serial reconciliation body**

In `src/renderer/components/Layout/AppLayout.tsx`, replace the nested `reconcile` helper and the `for (const ws of state.workspaces)` loop inside `reconcilePtys` with this code:

```ts
      const state = useStore.getState();
      const tasks = collectPtyReconcileTasks(state.workspaces);

      await runWithConcurrency(tasks, 4, async (task) => {
        if (activeIds.has(task.ptyId)) {
          console.log(`[AppLayout] Surface ${task.surfaceId}: reconnecting to ${task.ptyId}`);
          const result = await window.electronAPI.pty.reconnect(task.ptyId);
          console.log(`[AppLayout] Reconnect result:`, result);
          if (!result.success) {
            console.warn(`[AppLayout] Reconnect failed, clearing ptyId`);
            useStore.getState().updateSurfacePtyId(task.paneId, task.surfaceId, '');
          }
          return;
        }

        console.log(`[AppLayout] Surface ${task.surfaceId}: ptyId ${task.ptyId} not in daemon, creating new PTY`);
        try {
          const cwd = resolveRestoredSurfaceCwd(task.surfaceCwd, task.workspaceCwd);
          const newPty = await window.electronAPI.pty.create(
            withDefaultPtyOptions({ cwd, workspaceId: task.workspaceId }, useStore.getState().defaultShell, useStore.getState().defaultCwd)
          );
          useStore.getState().updateSurfacePtyId(task.paneId, task.surfaceId, newPty.id);
        } catch (err) {
          console.error(`[AppLayout] Failed to create replacement PTY:`, err);
          useStore.getState().updateSurfacePtyId(task.paneId, task.surfaceId, '');
        }
      });

      console.log('[AppLayout] Reconciliation complete');
```

After replacement, `reconcilePtys` should still:

```ts
  const reconcilePtys = useCallback(async () => {
    const listResult = await ipcInvoke<{ id: string }[]>(() =>
      window.electronAPI.pty.list()
    );
    if (!listResult.ok) {
      console.error('[AppLayout] PTY reconciliation aborted:', listResult.error.code);
      return;
    }
    try {
      const activePtys = listResult.data;
      const activeIds = new Set(activePtys.map((p: { id: string }) => p.id));
      console.log('[AppLayout] Daemon active PTYs:', [...activeIds]);

      const state = useStore.getState();
      const tasks = collectPtyReconcileTasks(state.workspaces);

      await runWithConcurrency(tasks, 4, async (task) => {
        // code from above
      });

      console.log('[AppLayout] Reconciliation complete');
    } catch (err) {
      console.error('[AppLayout] PTY reconciliation failed:', err);
    }
  }, [ipcInvoke]);
```

- [ ] **Step 5: Run targeted tests and typecheck**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts src/renderer/utils/__tests__/startupRestore.test.ts
npx tsc --noEmit
```

Expected:
- Vitest: both test files PASS.
- TypeScript: exit 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Layout/AppLayout.tsx src/renderer/utils/reconcilePtys.ts src/renderer/utils/__tests__/reconcilePtys.test.ts
git commit -m "feat: reconcile restored ptys concurrently"
```

---

### Task 4: Final verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run related renderer tests**

Run:

```bash
npm test -- src/renderer/utils/__tests__/reconcilePtys.test.ts src/renderer/utils/__tests__/startupRestore.test.ts src/renderer/utils/__tests__/restoreCwd.test.ts src/renderer/stores/slices/__tests__/surfaceSlice.test.ts src/renderer/stores/slices/__tests__/workspaceSlice.test.ts
```

Expected: all listed test files PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: Vitest exits 0. Existing `node-pty` `AttachConsole failed` stderr may appear on Windows, but the suite must report all test files and tests passed.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: exit 0 with no output.

- [ ] **Step 4: Inspect diff**

Run:

```bash
git diff -- src/renderer/components/Layout/AppLayout.tsx src/renderer/utils/reconcilePtys.ts src/renderer/utils/__tests__/reconcilePtys.test.ts
```

Expected:
- `AppLayout.tsx` no longer has serial recursive `await reconcile(child, ...)` for restored terminals.
- `runWithConcurrency(tasks, 4, ...)` is used in `reconcilePtys`.
- Utility tests cover task collection and concurrency behavior.

- [ ] **Step 5: Commit any final test adjustments**

If Task 4 changed files, run:

```bash
git add src/renderer/components/Layout/AppLayout.tsx src/renderer/utils/reconcilePtys.ts src/renderer/utils/__tests__/reconcilePtys.test.ts
git commit -m "test: verify concurrent pty reconciliation"
```

If Task 4 did not change files, do not create an empty commit.

---

## Self-Review

**Spec coverage:** The plan covers the approved approach: bounded concurrent reconciliation in the renderer while keeping Electron IPC/store side effects in `AppLayout`.

**Placeholder scan:** No TBD/TODO placeholders remain. Every code-changing step includes concrete code and exact commands.

**Type consistency:** `PtyReconcileTask`, `collectPtyReconcileTasks`, and `runWithConcurrency` names are consistent across tests, utility, and `AppLayout` integration steps.
