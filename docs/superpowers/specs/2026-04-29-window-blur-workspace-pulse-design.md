# Window blur workspace pulse design

## Goal

Show the sidebar output activity pulse for the active workspace when the wmux window is not focused. Keep the current behavior while the wmux window is focused: active workspace activity remains hidden, inactive workspace activity remains visible.

## Current behavior

`shouldShowWorkspaceOutputActivity()` only returns true when the workspace is not the active workspace and the workspace has recent output activity. `WorkspaceItem` and `MiniSidebar` both depend on that helper, so the active workspace never shows the pulse.

## Design

Track renderer window focus in UI state:

- Add `isWindowFocused: boolean` to `UiSlice`, initially `true`.
- Add `setWindowFocused(focused: boolean)` to update it.
- Register a renderer-side `window` `focus`/`blur` listener once at app level, alongside existing global renderer hooks.

Update output activity visibility rules:

- If `workspaceOutputActive[workspaceId] !== true`, return false.
- If `workspaceId !== activeWorkspaceId`, return true.
- If `workspaceId === activeWorkspaceId`, return true only when `isWindowFocused === false`.

Pass `isWindowFocused` from the store into `shouldShowWorkspaceOutputActivity()` from both sidebar variants.

## Components affected

- `src/renderer/stores/slices/uiSlice.ts`: stores focus state.
- `src/renderer/hooks/useWorkspaceOutputActivity.ts` or a small adjacent hook: registers focus/blur listeners.
- `src/renderer/components/Layout/AppLayout.tsx`: invokes the window focus hook once if needed.
- `src/renderer/utils/workspaceOutputActivity.ts`: owns the visibility rule.
- `src/renderer/components/Sidebar/WorkspaceItem.tsx`: passes focus state to the rule.
- `src/renderer/components/Sidebar/MiniSidebar.tsx`: passes focus state to the rule.
- `src/renderer/utils/__tests__/workspaceOutputActivity.test.ts`: verifies focused and blurred active-workspace behavior.

## Testing

Unit tests should cover:

1. Active workspace with output while window is focused: hidden.
2. Active workspace with output while window is blurred: visible.
3. Inactive workspace with output: visible.
4. Workspace with no output activity: hidden.

For UI verification, run the renderer app, trigger workspace output activity, and confirm the active workspace pulse appears after switching focus away from wmux and disappears again when focus returns.
