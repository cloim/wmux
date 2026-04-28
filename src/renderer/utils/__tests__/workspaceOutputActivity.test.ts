import { describe, expect, it } from 'vitest';
import { shouldShowWorkspaceOutputActivity } from '../workspaceOutputActivity';

describe('shouldShowWorkspaceOutputActivity', () => {
  it('hides output activity for the active workspace', () => {
    expect(
      shouldShowWorkspaceOutputActivity('ws-a', 'ws-a', { 'ws-a': true }),
    ).toBe(false);
  });

  it('shows output activity for an inactive workspace with recent output', () => {
    expect(
      shouldShowWorkspaceOutputActivity('ws-b', 'ws-a', { 'ws-b': true }),
    ).toBe(true);
  });
});
