import { describe, expect, it } from 'vitest';
import type { Notification } from '../../../shared/types';
import { countUnreadForWorkspace } from '../workspaceUnread';

describe('countUnreadForWorkspace', () => {
  it('counts only unread notifications for the requested workspace', () => {
    const notifications: Notification[] = [
      {
        id: 'n1',
        workspaceId: 'ws-a',
        surfaceId: 's1',
        type: 'agent',
        title: 'A',
        body: 'done',
        timestamp: 1,
        read: false,
      },
      {
        id: 'n2',
        workspaceId: 'ws-a',
        surfaceId: 's1',
        type: 'agent',
        title: 'A read',
        body: 'done',
        timestamp: 2,
        read: true,
      },
      {
        id: 'n3',
        workspaceId: 'ws-b',
        surfaceId: 's2',
        type: 'info',
        title: 'B',
        body: 'done',
        timestamp: 3,
        read: false,
      },
    ];

    expect(countUnreadForWorkspace(notifications, 'ws-a')).toBe(1);
  });
});
