import { describe, expect, it } from 'vitest';
import { isFileDrag } from '../dragDrop';

describe('isFileDrag', () => {
  it('returns true only when the drag payload contains files', () => {
    expect(isFileDrag({ types: ['Files'] })).toBe(true);
    expect(isFileDrag({ types: ['text/plain'] })).toBe(false);
    expect(isFileDrag(undefined)).toBe(false);
  });
});
