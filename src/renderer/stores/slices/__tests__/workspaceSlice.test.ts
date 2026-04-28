import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createWorkspaceSlice, type WorkspaceSlice } from '../workspaceSlice';
import { createWorkspace, type Notification, type Workspace } from '../../../../shared/types';

// Minimal store satisfying WorkspaceSlice + the pieces of UISlice the
// setActiveWorkspace logic touches (multiviewIds). We don't pull in the
// real UISlice to keep the test isolated to setActiveWorkspace behavior.
type TestState = WorkspaceSlice & {
  multiviewIds: string[];
  defaultCwd: string;
  notifications: Notification[];
};

function createTestStore(initialWorkspaces: Workspace[], activeId: string, multiviewIds: string[] = []) {
  return create<TestState>()(
    immer((...args) => ({
      // @ts-expect-error — minimal test store doesn't match full StoreState
      ...createWorkspaceSlice(...args),
      // Override the slice's defaults AFTER spreading. createWorkspaceSlice
      // initializes workspaces with a fresh "Workspace 1" — we replace those
      // with our test fixtures here.
      workspaces: initialWorkspaces,
      activeWorkspaceId: activeId,
      multiviewIds,
      defaultCwd: '',
      notifications: [],
    }))
  );
}

describe('WorkspaceSlice.setActiveWorkspace', () => {
  let wsA: Workspace;
  let wsB: Workspace;
  let wsC: Workspace;

  beforeEach(() => {
    wsA = createWorkspace('A');
    wsB = createWorkspace('B');
    wsC = createWorkspace('C');
  });

  it('switches active workspace when target exists', () => {
    const store = createTestStore([wsA, wsB], wsA.id);
    store.getState().setActiveWorkspace(wsB.id);
    expect(store.getState().activeWorkspaceId).toBe(wsB.id);
  });

  it('ignores unknown workspace ids', () => {
    const store = createTestStore([wsA], wsA.id);
    store.getState().setActiveWorkspace('does-not-exist');
    expect(store.getState().activeWorkspaceId).toBe(wsA.id);
  });

  // Regression: 멀티뷰 상태에서 다른 탭을 눌러도 화면이 안 바뀌던 버그.
  // Cause: AppLayout renders the multiview grid whenever multiviewIds.length
  // >= 2, regardless of activeWorkspaceId. So plain-clicking a non-multiview
  // tab updated activeWorkspaceId silently while the layout kept showing the
  // old grid. Fix: setActiveWorkspace exits multiview when the target isn't
  // part of it.
  it('exits multiview when switching to a workspace not in the multiview set', () => {
    const store = createTestStore(
      [wsA, wsB, wsC],
      wsA.id,
      [wsA.id, wsB.id], // multiview = A + B
    );
    store.getState().setActiveWorkspace(wsC.id); // C is NOT in multiview

    expect(store.getState().activeWorkspaceId).toBe(wsC.id);
    expect(store.getState().multiviewIds).toEqual([]);
  });

  it('keeps multiview intact when switching to a workspace already in it', () => {
    const store = createTestStore(
      [wsA, wsB, wsC],
      wsA.id,
      [wsA.id, wsB.id],
    );
    store.getState().setActiveWorkspace(wsB.id); // B IS in multiview

    expect(store.getState().activeWorkspaceId).toBe(wsB.id);
    expect(store.getState().multiviewIds).toEqual([wsA.id, wsB.id]);
  });

  it('does not touch multiview when fewer than 2 ids are present', () => {
    const store = createTestStore(
      [wsA, wsB],
      wsA.id,
      [], // multiview inactive
    );
    store.getState().setActiveWorkspace(wsB.id);

    expect(store.getState().activeWorkspaceId).toBe(wsB.id);
    expect(store.getState().multiviewIds).toEqual([]);
  });

  it('marks all unread notifications in the selected workspace as read', () => {
    const store = createTestStore([wsA, wsB], wsA.id);
    store.setState({
      notifications: [
        {
          id: 'notif-a',
          workspaceId: wsA.id,
          surfaceId: 'surface-a',
          type: 'agent',
          title: 'A',
          body: 'done',
          timestamp: 1,
          read: false,
        },
        {
          id: 'notif-b1',
          workspaceId: wsB.id,
          surfaceId: 'surface-b1',
          type: 'agent',
          title: 'B1',
          body: 'done',
          timestamp: 2,
          read: false,
        },
        {
          id: 'notif-b2',
          workspaceId: wsB.id,
          surfaceId: 'surface-b2',
          type: 'warning',
          title: 'B2',
          body: 'check',
          timestamp: 3,
          read: false,
        },
      ],
    });

    store.getState().setActiveWorkspace(wsB.id);

    expect(store.getState().notifications).toEqual([
      expect.objectContaining({ id: 'notif-a', read: false }),
      expect.objectContaining({ id: 'notif-b1', read: true }),
      expect.objectContaining({ id: 'notif-b2', read: true }),
    ]);
  });

  it('ignores unknown ids without disturbing multiview', () => {
    const store = createTestStore(
      [wsA, wsB],
      wsA.id,
      [wsA.id, wsB.id],
    );
    store.getState().setActiveWorkspace('ghost');
    expect(store.getState().activeWorkspaceId).toBe(wsA.id);
    expect(store.getState().multiviewIds).toEqual([wsA.id, wsB.id]);
  });
});

describe('WorkspaceSlice.reorderWorkspace', () => {
  let wsA: Workspace;
  let wsB: Workspace;
  let wsC: Workspace;

  beforeEach(() => {
    wsA = createWorkspace('A');
    wsB = createWorkspace('B');
    wsC = createWorkspace('C');
  });

  it('moves a workspace to a new index without changing the active workspace', () => {
    const store = createTestStore([wsA, wsB, wsC], wsB.id);

    store.getState().reorderWorkspace(0, 2);

    expect(store.getState().workspaces.map((ws) => ws.id)).toEqual([wsB.id, wsC.id, wsA.id]);
    expect(store.getState().activeWorkspaceId).toBe(wsB.id);
  });

  it('clamps target indexes so dragging beyond the list drops at the nearest edge', () => {
    const store = createTestStore([wsA, wsB, wsC], wsA.id);

    store.getState().reorderWorkspace(0, 99);
    expect(store.getState().workspaces.map((ws) => ws.id)).toEqual([wsB.id, wsC.id, wsA.id]);

    store.getState().reorderWorkspace(2, -99);
    expect(store.getState().workspaces.map((ws) => ws.id)).toEqual([wsA.id, wsB.id, wsC.id]);
  });

  it('ignores invalid source indexes', () => {
    const store = createTestStore([wsA, wsB, wsC], wsA.id);

    store.getState().reorderWorkspace(99, 0);

    expect(store.getState().workspaces.map((ws) => ws.id)).toEqual([wsA.id, wsB.id, wsC.id]);
  });
});

describe('WorkspaceSlice.loadSession terminal preferences', () => {
  it('restores defaultCwd from the saved session', () => {
    const ws = createWorkspace('A');
    const store = createTestStore([ws], ws.id);

    store.getState().loadSession({
      workspaces: [ws],
      activeWorkspaceId: ws.id,
      sidebarVisible: true,
      defaultCwd: 'D:\\Code',
    });

    expect(store.getState().defaultCwd).toBe('D:\\Code');
  });
});
