export function shouldShowWorkspaceOutputActivity(
  workspaceId: string,
  activeWorkspaceId: string | null,
  workspaceOutputActive: Record<string, boolean>,
): boolean {
  return workspaceId !== activeWorkspaceId && workspaceOutputActive[workspaceId] === true;
}
