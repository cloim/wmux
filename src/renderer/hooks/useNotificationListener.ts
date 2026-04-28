import { useEffect } from 'react';
import { useStore } from '../stores';
import type { NotificationType, Pane, PaneLeaf, Workspace } from '../../shared/types';
import { playNotificationSound } from './useNotificationSound';

function findSurfaceByPtyId(root: Pane, ptyId: string): { surfaceId: string; paneId: string } | null {
  if (root.type === 'leaf') {
    const surface = root.surfaces.find((s) => s.ptyId === ptyId);
    if (surface) return { surfaceId: surface.id, paneId: root.id };
    return null;
  }
  for (const child of root.children) {
    const found = findSurfaceByPtyId(child, ptyId);
    if (found) return found;
  }
  return null;
}

function findActiveSurface(root: Pane, activePaneId: string): { surfaceId: string; paneId: string } | null {
  if (root.type === 'leaf') {
    if (root.id !== activePaneId) return null;
    const surface = root.surfaces.find((s) => s.id === root.activeSurfaceId) ?? root.surfaces[0];
    return surface ? { surfaceId: surface.id, paneId: root.id } : null;
  }
  for (const child of root.children) {
    const found = findActiveSurface(child, activePaneId);
    if (found) return found;
  }
  return null;
}

export function resolveNotificationTarget(
  workspaces: Workspace[],
  activeWorkspaceId: string,
  ptyId: string | null,
): { workspaceId: string; surfaceId: string } | null {
  if (ptyId) {
    for (const ws of workspaces) {
      const found = findSurfaceByPtyId(ws.rootPane, ptyId);
      if (found) return { workspaceId: ws.id, surfaceId: found.surfaceId };
    }
    return null;
  }

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0];
  if (!activeWorkspace) return null;

  const found = findActiveSurface(activeWorkspace.rootPane, activeWorkspace.activePaneId);
  if (found) return { workspaceId: activeWorkspace.id, surfaceId: found.surfaceId };

  return null;
}

/** Check if a ptyId belongs to the active pane's active surface in a workspace */
function isActivePtySurface(ws: { rootPane: Pane; activePaneId: string }, ptyId: string): boolean {
  const findActiveLeaf = (pane: Pane): PaneLeaf | null => {
    if (pane.type === 'leaf') return pane.id === ws.activePaneId ? pane : null;
    for (const child of pane.children) {
      const found = findActiveLeaf(child);
      if (found) return found;
    }
    return null;
  };
  const leaf = findActiveLeaf(ws.rootPane);
  if (!leaf) return false;
  const activeSurface = leaf.surfaces.find((s) => s.id === leaf.activeSurfaceId);
  return activeSurface?.ptyId === ptyId;
}

// Throttle notification sounds — min 2s between sounds of same type
const lastSoundTime: Record<string, number> = {};
const SOUND_THROTTLE_MS = 2000;

function notificationToastLevel(type: NotificationType): 'info' | 'warn' | 'error' {
  switch (type) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warn';
    case 'agent':
    case 'info':
    default:
      return 'info';
  }
}

export function useNotificationListener() {
  useEffect(() => {
    const unsubNotif = window.electronAPI.notification.onNew((ptyId, data) => {
      const state = useStore.getState();
      const target = resolveNotificationTarget(state.workspaces, state.activeWorkspaceId, ptyId);
      if (!target) return;

      const type = data.type as NotificationType;
      state.addNotification({
        surfaceId: target.surfaceId,
        workspaceId: target.workspaceId,
        type,
        title: data.title,
        body: data.body,
      });
      if (useStore.getState().toastEnabled) {
        const message = data.body ? `${data.title}: ${data.body}` : data.title;
        useStore.getState().pushToast({
          message,
          level: notificationToastLevel(type),
        });
      }
      // Play sound if enabled (throttled)
      if (useStore.getState().notificationSoundEnabled) {
        const now = Date.now();
        const key = data.type;
        if (!lastSoundTime[key] || now - lastSoundTime[key] > SOUND_THROTTLE_MS) {
          lastSoundTime[key] = now;
          playNotificationSound(data.type as NotificationType);
        }
      }
    });

    const unsubCwd = window.electronAPI.notification.onCwdChanged((ptyId, cwd) => {
      const state = useStore.getState();
      for (const ws of state.workspaces) {
        const found = findSurfaceByPtyId(ws.rootPane, ptyId);
        if (found) {
          state.updateWorkspaceMetadata(ws.id, { cwd });
          break;
        }
      }
    });

    const unsubMeta = window.electronAPI.metadata.onUpdate((ptyId, data) => {
      const state = useStore.getState();
      for (const ws of state.workspaces) {
        const found = findSurfaceByPtyId(ws.rootPane, ptyId);
        if (found) {
          // Only update CWD from the active pane's active surface to prevent
          // stale PTYs from overwriting the current directory
          const isActiveSurface = isActivePtySurface(ws, ptyId);
          if (isActiveSurface) {
            state.updateWorkspaceMetadata(ws.id, data);
          } else {
            // For non-active surfaces, update metadata but exclude cwd
            const { cwd: _cwd, ...rest } = data;
            if (Object.keys(rest).length > 0) {
              state.updateWorkspaceMetadata(ws.id, rest);
            }
          }
          break;
        }
      }
    });

    const unsubGitBranch = window.electronAPI.notification.onGitBranchChanged((ptyId, branch) => {
      const state = useStore.getState();
      for (const ws of state.workspaces) {
        const found = findSurfaceByPtyId(ws.rootPane, ptyId);
        if (found) {
          state.updateWorkspaceMetadata(ws.id, { gitBranch: branch });
          break;
        }
      }
    });

    const unsubToken = window.electronAPI.token.onUpdate((ptyId, data) => {
      useStore.getState().updateTokenData(ptyId, data);
    });

    return () => {
      unsubNotif();
      unsubCwd();
      unsubMeta();
      unsubGitBranch();
      unsubToken();
    };
  }, []);
}
