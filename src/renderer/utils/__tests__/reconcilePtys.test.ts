import { describe, expect, it } from 'vitest';
import type { Pane, Workspace } from '../../../shared/types';
import { collectPtyReconcileTasks, collectStaleActivePtyIds, runWithConcurrency } from '../reconcilePtys';

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

    await expect(promises).resolves.toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 6 },
      { status: 'fulfilled', value: 8 },
      { status: 'fulfilled', value: 10 },
    ]);
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

  it('identifies active daemon ptys that are not referenced by restored terminal surfaces', () => {
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
          id: 'surface-browser',
          ptyId: '',
          title: 'Browser',
          shell: '',
          cwd: '',
          surfaceType: 'browser',
        },
      ],
    };

    const staleIds = collectStaleActivePtyIds([workspace(rootPane)], [
      { id: 'pty-a' },
      { id: 'daemon-orphan-1' },
      { id: 'daemon-orphan-2' },
    ]);

    expect(staleIds).toEqual(['daemon-orphan-1', 'daemon-orphan-2']);
  });

  it('keeps additional referenced ptys such as floating terminal sessions', () => {
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
      ],
    };

    const staleIds = collectStaleActivePtyIds([workspace(rootPane)], [
      { id: 'pty-a' },
      { id: 'floating-pty' },
      { id: 'daemon-orphan' },
    ], ['floating-pty']);

    expect(staleIds).toEqual(['daemon-orphan']);
  });
});
