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
