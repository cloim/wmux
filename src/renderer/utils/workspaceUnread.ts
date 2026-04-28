import type { Notification } from '../../shared/types';

export function countUnreadForWorkspace(notifications: Notification[], workspaceId: string): number {
  return notifications.reduce((count, notification) => {
    if (notification.read || notification.workspaceId !== workspaceId) return count;
    return count + 1;
  }, 0);
}
