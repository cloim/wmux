# Window Blur Workspace Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the sidebar output activity pulse for the active workspace when the wmux window is blurred, while keeping it hidden for the active workspace when the window is focused.

**Architecture:** Store the renderer window focus state in the existing UI Zustand slice. A small hook listens to `window` focus/blur events and updates that state. The existing workspace output activity helper receives the focus state and remains the single source of truth for sidebar pulse visibility.

**Tech Stack:** React 19, Zustand 5 with immer, Electron renderer, TypeScript, Vitest.

---

## File Structure

- Modify `src/renderer/stores/slices/uiSlice.ts`
  - Add `isWindowFocused` and `setWindowFocused` to `UISlice`.
  - Initialize focus state to `true` and update it through the slice setter.
- Modify `src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts`
  - Add a focused unit test for the new UI slice state setter.
- Modify `src/renderer/utils/workspaceOutputActivity.ts`
  - Extend `shouldShowWorkspaceOutputActivity()` with an `isWindowFocused` parameter.
  - Keep all output activity visibility rules in this helper.
- Modify `src/renderer/utils/__tests__/workspaceOutputActivity.test.ts`
  - Update existing tests for the new signature.
  - Add active-workspace blurred and no-output coverage.
- Create `src/renderer/hooks/useWindowFocusState.ts`
  - Register one renderer `window` focus/blur listener pair.
  - Synchronize the initial store value from `document.hasFocus()` when the hook mounts.
  - Clean listeners up on unmount.
- Modify `src/renderer/components/Layout/AppLayout.tsx`
  - Import and invoke `useWindowFocusState()` next to existing global renderer hooks.
- Modify `src/renderer/components/Sidebar/WorkspaceItem.tsx`
  - Read `isWindowFocused` from the store and pass it to `shouldShowWorkspaceOutputActivity()`.
- Modify `src/renderer/components/Sidebar/MiniSidebar.tsx`
  - Read `isWindowFocused` from the store and pass it to `shouldShowWorkspaceOutputActivity()`.

---

### Task 1: Add window focus state to UI slice

**Files:**
- Modify: `src/renderer/stores/slices/uiSlice.ts:75-84`
- Modify: `src/renderer/stores/slices/uiSlice.ts:369-379`
- Test: `src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts`

- [ ] **Step 1: Write the failing slice test**

Add this test inside `describe('UISlice workspace output activity', () => { ... })` in `src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts`, after the existing test:

```ts
  it('tracks renderer window focus state', () => {
    const store = createTestStore();

    expect(store.getState().isWindowFocused).toBe(true);

    store.getState().setWindowFocused(false);
    expect(store.getState().isWindowFocused).toBe(false);

    store.getState().setWindowFocused(true);
    expect(store.getState().isWindowFocused).toBe(true);
  });
```

- [ ] **Step 2: Run the slice test to verify it fails**

Run:

```bash
npm test -- src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts
```

Expected: FAIL because `isWindowFocused` and `setWindowFocused` do not exist on `UISlice` yet.

- [ ] **Step 3: Add the UI slice interface fields**

In `src/renderer/stores/slices/uiSlice.ts`, update the `UISlice` interface near `workspaceOutputActive`:

```ts
  notificationRingEnabled: boolean;
  setNotificationRingEnabled: (enabled: boolean) => void;

  isWindowFocused: boolean;
  setWindowFocused: (focused: boolean) => void;

  workspaceOutputActive: Record<string, boolean>;
  setWorkspaceOutputActive: (workspaceId: string, active: boolean) => void;
```

- [ ] **Step 4: Add the UI slice state and setter**

In `src/renderer/stores/slices/uiSlice.ts`, update the implementation near `notificationRingEnabled` and `workspaceOutputActive`:

```ts
  notificationRingEnabled: true,

  setNotificationRingEnabled: (enabled) => set((state) => {
    state.notificationRingEnabled = enabled;
  }),

  isWindowFocused: true,

  setWindowFocused: (focused) => set((state) => {
    state.isWindowFocused = focused;
  }),

  workspaceOutputActive: {},

  setWorkspaceOutputActive: (workspaceId, active) => set((state) => {
    state.workspaceOutputActive[workspaceId] = active;
  }),
```

- [ ] **Step 5: Run the slice test to verify it passes**

Run:

```bash
npm test -- src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/renderer/stores/slices/uiSlice.ts src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts
git commit -m "feat: track renderer window focus state"
```

---

### Task 2: Update workspace output activity visibility rules

**Files:**
- Modify: `src/renderer/utils/workspaceOutputActivity.ts`
- Modify: `src/renderer/utils/__tests__/workspaceOutputActivity.test.ts`

- [ ] **Step 1: Replace the helper tests with full focused/blurred coverage**

Replace the body of `src/renderer/utils/__tests__/workspaceOutputActivity.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { shouldShowWorkspaceOutputActivity } from '../workspaceOutputActivity';

describe('shouldShowWorkspaceOutputActivity', () => {
  it('hides output activity for the active workspace while the window is focused', () => {
    expect(
      shouldShowWorkspaceOutputActivity('ws-a', 'ws-a', { 'ws-a': true }, true),
    ).toBe(false);
  });

  it('shows output activity for the active workspace while the window is blurred', () => {
    expect(
      shouldShowWorkspaceOutputActivity('ws-a', 'ws-a', { 'ws-a': true }, false),
    ).toBe(true);
  });

  it('shows output activity for an inactive workspace with recent output', () => {
    expect(
      shouldShowWorkspaceOutputActivity('ws-b', 'ws-a', { 'ws-b': true }, true),
    ).toBe(true);
  });

  it('hides output activity when the workspace has no recent output', () => {
    expect(
      shouldShowWorkspaceOutputActivity('ws-a', 'ws-a', { 'ws-a': false }, false),
    ).toBe(false);
    expect(
      shouldShowWorkspaceOutputActivity('ws-b', 'ws-a', {}, true),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```bash
npm test -- src/renderer/utils/__tests__/workspaceOutputActivity.test.ts
```

Expected: FAIL because `shouldShowWorkspaceOutputActivity()` still accepts only three parameters and still hides the active workspace unconditionally.

- [ ] **Step 3: Update the helper implementation**

Replace `src/renderer/utils/workspaceOutputActivity.ts` with:

```ts
export function shouldShowWorkspaceOutputActivity(
  workspaceId: string,
  activeWorkspaceId: string | null,
  workspaceOutputActive: Record<string, boolean>,
  isWindowFocused: boolean,
): boolean {
  if (workspaceOutputActive[workspaceId] !== true) return false;
  if (workspaceId !== activeWorkspaceId) return true;
  return !isWindowFocused;
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
npm test -- src/renderer/utils/__tests__/workspaceOutputActivity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/renderer/utils/workspaceOutputActivity.ts src/renderer/utils/__tests__/workspaceOutputActivity.test.ts
git commit -m "fix: show active workspace activity when blurred"
```

---

### Task 3: Wire window focus listener into the renderer

**Files:**
- Create: `src/renderer/hooks/useWindowFocusState.ts`
- Modify: `src/renderer/components/Layout/AppLayout.tsx:20-23`
- Modify: `src/renderer/components/Layout/AppLayout.tsx:187-190`

- [ ] **Step 1: Create the window focus hook**

Create `src/renderer/hooks/useWindowFocusState.ts` with:

```ts
import { useEffect } from 'react';
import { useStore } from '../stores';

export function useWindowFocusState() {
  useEffect(() => {
    const setFocused = (focused: boolean) => {
      useStore.getState().setWindowFocused(focused);
    };

    setFocused(document.hasFocus());

    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
}
```

- [ ] **Step 2: Import the hook in AppLayout**

In `src/renderer/components/Layout/AppLayout.tsx`, add this import next to the existing hook imports:

```ts
import { useWindowFocusState } from '../../hooks/useWindowFocusState';
```

The hook import block should include:

```ts
import { useKeyboard } from '../../hooks/useKeyboard';
import { useNotificationListener } from '../../hooks/useNotificationListener';
import { useWorkspaceOutputActivity } from '../../hooks/useWorkspaceOutputActivity';
import { useWindowFocusState } from '../../hooks/useWindowFocusState';
import { useRpcBridge } from '../../hooks/useRpcBridge';
```

- [ ] **Step 3: Invoke the hook once in AppLayout**

In `src/renderer/components/Layout/AppLayout.tsx`, call it next to existing global hooks:

```ts
  useKeyboard();
  useNotificationListener();
  useWorkspaceOutputActivity();
  useWindowFocusState();
  useRpcBridge();
```

- [ ] **Step 4: Run TypeScript checks through renderer build**

Run:

```bash
npm run lint -- src/renderer/hooks/useWindowFocusState.ts src/renderer/components/Layout/AppLayout.tsx
```

Expected: PASS with no lint errors for the new hook and import.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add src/renderer/hooks/useWindowFocusState.ts src/renderer/components/Layout/AppLayout.tsx
git commit -m "feat: sync renderer window focus state"
```

---

### Task 4: Pass window focus state to both sidebar variants

**Files:**
- Modify: `src/renderer/components/Sidebar/WorkspaceItem.tsx:52-58`
- Modify: `src/renderer/components/Sidebar/MiniSidebar.tsx:14-18`
- Modify: `src/renderer/components/Sidebar/MiniSidebar.tsx:57-61`

- [ ] **Step 1: Update WorkspaceItem selector**

In `src/renderer/components/Sidebar/WorkspaceItem.tsx`, replace the `outputActive` selector with:

```ts
  const outputActive = useStore((s) =>
    shouldShowWorkspaceOutputActivity(
      workspace.id,
      s.activeWorkspaceId,
      s.workspaceOutputActive,
      s.isWindowFocused,
    ),
  );
```

- [ ] **Step 2: Update MiniSidebar store reads**

In `src/renderer/components/Sidebar/MiniSidebar.tsx`, add this store read near `workspaceOutputActive`:

```ts
  const workspaceOutputActive = useStore((s) => s.workspaceOutputActive);
  const isWindowFocused = useStore((s) => s.isWindowFocused);
```

- [ ] **Step 3: Update MiniSidebar helper call**

In `src/renderer/components/Sidebar/MiniSidebar.tsx`, update the `shouldShowWorkspaceOutputActivity()` call inside `workspaces.map`:

```ts
          const outputActive = shouldShowWorkspaceOutputActivity(
            ws.id,
            activeWorkspaceId,
            workspaceOutputActive,
            isWindowFocused,
          );
```

- [ ] **Step 4: Run all workspace activity tests**

Run:

```bash
npm test -- src/renderer/utils/__tests__/workspaceOutputActivity.test.ts src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run lint on changed TypeScript/React files**

Run:

```bash
npm run lint -- src/renderer/components/Sidebar/WorkspaceItem.tsx src/renderer/components/Sidebar/MiniSidebar.tsx src/renderer/components/Layout/AppLayout.tsx src/renderer/hooks/useWindowFocusState.ts src/renderer/utils/workspaceOutputActivity.ts src/renderer/stores/slices/uiSlice.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add src/renderer/components/Sidebar/WorkspaceItem.tsx src/renderer/components/Sidebar/MiniSidebar.tsx
git commit -m "fix: wire window focus into workspace pulse"
```

---

### Task 5: Final verification

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run lint for the repository**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Start the Electron app for manual UI verification**

Run:

```bash
npm start
```

Expected: Electron app opens successfully.

- [ ] **Step 4: Verify focused-window behavior manually**

In the running app:

1. Keep the wmux window focused.
2. Use a terminal in the active workspace to produce output, for example by typing a command that prints text.
3. Confirm the active workspace sidebar item does not show the output activity pulse.
4. Produce output in an inactive workspace.
5. Confirm the inactive workspace sidebar item still shows the output activity pulse.

Expected: active focused workspace has no pulse; inactive workspace has pulse.

- [ ] **Step 5: Verify blurred-window behavior manually**

In the running app:

1. Select a workspace so it is the active workspace.
2. Start output in that workspace that continues briefly or repeats.
3. Switch focus to another application window before or while output arrives.
4. Confirm the active workspace sidebar item shows the output activity pulse while wmux is blurred.
5. Focus the wmux window again.
6. Confirm the active workspace pulse disappears when wmux regains focus, assuming output activity is still active or on the next activity recalculation.

Expected: active blurred workspace shows pulse; active focused workspace hides pulse again.

- [ ] **Step 6: Review git diff for unrelated changes**

Run:

```bash
git status --short
git diff -- src/renderer/stores/slices/uiSlice.ts src/renderer/stores/slices/__tests__/uiSlice.workspaceActivity.test.ts src/renderer/utils/workspaceOutputActivity.ts src/renderer/utils/__tests__/workspaceOutputActivity.test.ts src/renderer/hooks/useWindowFocusState.ts src/renderer/components/Layout/AppLayout.tsx src/renderer/components/Sidebar/WorkspaceItem.tsx src/renderer/components/Sidebar/MiniSidebar.tsx
```

Expected: Only changes described in this plan are present in these files. Existing unrelated working tree changes may still appear in `git status --short`; do not overwrite or stage them unless they are part of this feature.

- [ ] **Step 7: Commit final verification note if source changed during verification**

If manual verification required a source fix, commit that fix with:

```bash
git add <fixed-files>
git commit -m "fix: polish workspace pulse focus behavior"
```

If no source fix was required, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers storing focus state, registering focus/blur listeners, updating the shared activity visibility helper, wiring both sidebar variants, unit tests, lint, full tests, and manual UI verification.
- Placeholder scan: No placeholder tasks remain. Every code-changing step includes exact code or exact file edits.
- Type consistency: The plan consistently uses `isWindowFocused`, `setWindowFocused(focused: boolean)`, and `shouldShowWorkspaceOutputActivity(workspaceId, activeWorkspaceId, workspaceOutputActive, isWindowFocused)`.
