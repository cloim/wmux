import { normalizeStoredCwd } from '../../shared/cwd';

export function resolveRestoredSurfaceCwd(
  surfaceCwd: string | undefined,
  workspaceCwd: string | undefined,
): string | undefined {
  return normalizeStoredCwd(surfaceCwd) ?? normalizeStoredCwd(workspaceCwd);
}
