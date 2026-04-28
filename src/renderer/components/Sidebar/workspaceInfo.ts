import type { Pane, PaneLeaf, Workspace } from '../../../shared/types';

function collectLeaves(pane: Pane): PaneLeaf[] {
  if (pane.type === 'leaf') return [pane];
  return pane.children.flatMap(collectLeaves);
}

export function buildWorkspaceInfoLines(ws: Workspace): string[] {
  const leaves = collectLeaves(ws.rootPane);
  const meta = ws.metadata;

  const lines: string[] = [
    `# wmux Workspace: "${ws.name}"`,
    `- Workspace ID: ${ws.id}`,
    '',
    '## Panes',
  ];

  let paneIndex = 1;
  for (const leaf of leaves) {
    const isActive = leaf.id === ws.activePaneId;
    for (const s of leaf.surfaces) {
      const surfaceType = s.surfaceType || 'terminal';
      const activeTag = isActive ? '[ACTIVE] ' : '';

      if (surfaceType === 'browser') {
        lines.push(`${paneIndex}. ${activeTag}Browser`);
        lines.push(`   - Surface ID: ${s.id}`);
        if (s.browserUrl) lines.push(`   - URL: ${s.browserUrl}`);
      } else {
        lines.push(`${paneIndex}. ${activeTag}Terminal — ${s.shell || 'unknown'}`);
        lines.push(`   - Surface ID: ${s.id}`);
        lines.push(`   - PTY ID: ${s.ptyId}`);
        const cwd = s.cwd || meta?.cwd;
        if (cwd) lines.push(`   - CWD: ${cwd}`);
        if (meta?.gitBranch) lines.push(`   - Git: ${meta.gitBranch}`);
      }
      lines.push('');
      paneIndex++;
    }
  }

  lines.push('## MCP Control');
  lines.push('- Send command: terminal_send({ text: "..." })');
  lines.push('- Target specific terminal: terminal_send({ text: "...", ptyId: "<pty-id>" })');
  lines.push('- Navigate browser: browser_navigate({ url: "...", surfaceId: "<surface-id>" })');
  lines.push('- List all surfaces: surface_list()');

  return lines;
}
