import { describe, expect, it } from 'vitest';
import { createLeafPane, createSurface, type Pane } from '../../../shared/types';
import {
  collectEmptyLeavesForInitialSurfaceRestore,
  shouldReconcileOnDaemonConnected,
} from '../startupRestore';

describe('startup restore gating', () => {
  it('does not auto-create terminal surfaces before session load completes', () => {
    const emptyLeaf = createLeafPane();

    expect(collectEmptyLeavesForInitialSurfaceRestore(false, emptyLeaf)).toEqual([]);
  });

  it('collects empty leaf panes only after session load completes', () => {
    const emptyLeaf = createLeafPane();
    const filledLeaf = createLeafPane(createSurface('pty-1', 'pwsh', 'D:\\PROJECTS\\wmux'));
    const root: Pane = {
      id: 'root',
      type: 'branch',
      direction: 'horizontal',
      children: [emptyLeaf, filledLeaf],
    };

    expect(collectEmptyLeavesForInitialSurfaceRestore(true, root).map((pane) => pane.id)).toEqual([emptyLeaf.id]);
  });

  it('does not run daemon-connected reconciliation before session load completes', () => {
    expect(shouldReconcileOnDaemonConnected(false)).toBe(false);
    expect(shouldReconcileOnDaemonConnected(true)).toBe(true);
  });
});
