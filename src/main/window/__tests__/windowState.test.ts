import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WINDOW_BOUNDS,
  normalizeWindowState,
  snapshotWindowState,
} from '../windowState';

describe('windowState', () => {
  const displays = [
    { x: 0, y: 0, width: 1920, height: 1080 },
  ];

  it('uses default bounds when no saved window state exists', () => {
    expect(normalizeWindowState(undefined, displays).bounds).toEqual(DEFAULT_WINDOW_BOUNDS);
  });

  it('restores saved bounds that intersect a display work area', () => {
    expect(normalizeWindowState({
      bounds: { x: 100, y: 120, width: 1440, height: 900 },
    }, displays).bounds).toEqual({ x: 100, y: 120, width: 1440, height: 900 });
  });

  it('falls back to default bounds for off-screen saved bounds', () => {
    expect(normalizeWindowState({
      bounds: { x: -4000, y: -4000, width: 1440, height: 900 },
    }, displays).bounds).toEqual(DEFAULT_WINDOW_BOUNDS);
  });

  it('preserves maximized and fullscreen flags', () => {
    expect(normalizeWindowState({
      bounds: { x: 10, y: 10, width: 1000, height: 700 },
      isMaximized: true,
      isFullScreen: true,
    }, displays)).toMatchObject({
      isMaximized: true,
      isFullScreen: true,
    });
  });

  it('snapshots normal bounds while maximized', () => {
    const win = {
      getBounds: () => ({ x: 0, y: 0, width: 1920, height: 1080 }),
      getNormalBounds: () => ({ x: 80, y: 90, width: 1200, height: 760 }),
      isMaximized: () => true,
      isFullScreen: () => false,
    };

    expect(snapshotWindowState(win)).toEqual({
      bounds: { x: 80, y: 90, width: 1200, height: 760 },
      isMaximized: true,
      isFullScreen: false,
    });
  });
});
