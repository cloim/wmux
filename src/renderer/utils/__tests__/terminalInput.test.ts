import { describe, expect, it } from 'vitest';
import { getShiftEnterInput } from '../terminalInput';

describe('getShiftEnterInput', () => {
  it('uses bracketed paste newline so Shift+Enter inserts a line without submitting', () => {
    expect(getShiftEnterInput()).toBe('\x1b[200~\n\x1b[201~');
  });
});
