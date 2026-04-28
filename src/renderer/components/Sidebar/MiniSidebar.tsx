import { useStore } from '../../stores';
import { useT } from '../../hooks/useT';
import { useState } from 'react';

export default function MiniSidebar() {
  const t = useT();
  const sidebarPosition = useStore((s) => s.sidebarPosition);
  const workspaces = useStore((s) => s.workspaces);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useStore((s) => s.setActiveWorkspace);
  const reorderWorkspace = useStore((s) => s.reorderWorkspace);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const totalUnread = useStore((s) =>
    s.notifications.filter((n) => !n.read).length,
  );
  const workspaceOutputActive = useStore((s) => s.workspaceOutputActive);

  const addWorkspace = useStore((s) => s.addWorkspace);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const getDropIndex = (e: React.DragEvent<HTMLElement>, index: number): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? index : index + 1;
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
    const rawDropIndex = getDropIndex(e, index);
    setDropIndex(null);
    setDraggingIndex(null);
    if (!Number.isInteger(fromIndex)) return;
    const toIndex = rawDropIndex > fromIndex ? rawDropIndex - 1 : rawDropIndex;
    reorderWorkspace(fromIndex, toIndex);
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-mantle)] ${sidebarPosition === 'right' ? 'border-l' : 'border-r'} border-[var(--bg-surface)]`} style={{ width: 48 }}>
      {/* Header — new workspace button */}
      <button
        className="flex items-center justify-center h-10 text-[var(--text-subtle)] hover:text-[var(--accent-green)] transition-colors border-b border-[var(--bg-surface)] font-mono text-lg leading-none"
        onClick={() => addWorkspace()}
        title={t('sidebar.newWorkspaceTooltip')}
        data-onboarding-target="add-workspace"
      >
        +
      </button>

      {/* Workspace dots */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1">
        {workspaces.map((ws, i) => {
          const isActive = ws.id === activeWorkspaceId;
          const initial = ws.name.charAt(0).toUpperCase();
          const outputActive = workspaceOutputActive[ws.id] === true;

          return (
            <div key={ws.id} className="relative">
              {dropIndex === i && (
                <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-[var(--accent-blue)] rounded-full" />
              )}
              <button
                draggable
                className={`relative w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--text-main)]'
                    : 'text-[var(--text-muted)] hover:bg-[rgba(var(--bg-surface-rgb),0.5)] hover:text-[var(--text-sub)]'
                } ${outputActive ? 'workspace-output-tile' : ''} ${draggingIndex === i ? 'opacity-40' : 'opacity-100'}`}
                onClick={() => setActiveWorkspace(ws.id)}
                onDragStart={(e) => {
                  setDraggingIndex(i);
                  e.dataTransfer.setData('text/plain', String(i));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropIndex(getDropIndex(e, i));
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                    setDropIndex(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={() => {
                  setDraggingIndex(null);
                  setDropIndex(null);
                }}
                title={`${ws.name} (Ctrl+${i + 1})`}
              >
                {initial}
              </button>
              {i === workspaces.length - 1 && dropIndex === workspaces.length && (
                <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-[var(--accent-blue)] rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer — expand + status */}
      <div className="flex flex-col items-center gap-2 py-2 border-t border-[var(--bg-surface)]">
        {/* Unread badge */}
        {totalUnread > 0 && (
          <button
            className="w-8 h-8 rounded-md flex items-center justify-center bg-[rgba(var(--accent-blue-rgb),0.2)] text-[var(--accent-blue)] text-[10px] font-bold"
            onClick={() => useStore.getState().toggleNotificationPanel()}
            title={t('sidebar.unreadCount', { count: totalUnread })}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </button>
        )}

        {/* Expand sidebar button — same position as collapse button in full sidebar */}
        <button
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors font-mono text-[11px]"
          onClick={toggleSidebar}
          title={t('sidebar.expandTooltip')}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
