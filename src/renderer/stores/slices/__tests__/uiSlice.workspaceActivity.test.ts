import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createUISlice, type UISlice } from '../uiSlice';

function createTestStore() {
  return create<UISlice>()(
    immer((...args) => ({
      // @ts-expect-error — isolated slice test omits the rest of StoreState.
      ...createUISlice(...args),
    })),
  );
}

describe('UISlice workspace output activity', () => {
  it('tracks transient output activity by workspace id', () => {
    const store = createTestStore();

    store.getState().setWorkspaceOutputActive('ws-a', true);
    store.getState().setWorkspaceOutputActive('ws-b', true);
    store.getState().setWorkspaceOutputActive('ws-a', false);

    expect(store.getState().workspaceOutputActive).toEqual({
      'ws-a': false,
      'ws-b': true,
    });
  });
});
