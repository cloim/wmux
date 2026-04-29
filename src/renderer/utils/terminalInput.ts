const BRACKETED_PASTE_PREFIX = '\x1b[200~';
const BRACKETED_PASTE_SUFFIX = '\x1b[201~';

export function getShiftEnterInput(): string {
  return `${BRACKETED_PASTE_PREFIX}\n${BRACKETED_PASTE_SUFFIX}`;
}
