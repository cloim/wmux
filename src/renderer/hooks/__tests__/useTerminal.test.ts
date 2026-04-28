import { describe, expect, it } from 'vitest';
import { hasVisibleTerminalSize } from '../useTerminal';

describe('useTerminal visibility helpers', () => {
  it('rejects zero-sized containers before terminal fit', () => {
    const container = {
      offsetWidth: 0,
      offsetHeight: 24,
    } as HTMLElement;

    expect(hasVisibleTerminalSize(container)).toBe(false);
  });

  it('accepts containers with measurable width and height', () => {
    const container = {
      offsetWidth: 800,
      offsetHeight: 600,
    } as HTMLElement;

    expect(hasVisibleTerminalSize(container)).toBe(true);
  });
});
