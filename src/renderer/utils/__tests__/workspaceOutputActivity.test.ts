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
