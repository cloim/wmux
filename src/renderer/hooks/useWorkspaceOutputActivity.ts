import { useEffect, useRef } from 'react';
import { useStore } from '../stores';
import { findWorkspaceIdByPtyId } from '../utils/workspacePty';

const OUTPUT_IDLE_DELAY_MS = 1500;

export function useWorkspaceOutputActivity() {
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const clearActivityTimer = (workspaceId: string) => {
      const existing = timersRef.current[workspaceId];
      if (existing) clearTimeout(existing);
    };

    const unsubscribe = window.electronAPI.pty.onData((ptyId) => {
      const state = useStore.getState();
      const workspaceId = findWorkspaceIdByPtyId(state.workspaces, ptyId);
      if (!workspaceId) return;

      state.setWorkspaceOutputActive(workspaceId, true);
      clearActivityTimer(workspaceId);
      timersRef.current[workspaceId] = setTimeout(() => {
        useStore.getState().setWorkspaceOutputActive(workspaceId, false);
        delete timersRef.current[workspaceId];
      }, OUTPUT_IDLE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      for (const timer of Object.values(timersRef.current)) {
        clearTimeout(timer);
      }
      timersRef.current = {};
    };
  }, []);
}
