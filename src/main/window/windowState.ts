import type { WindowBounds, WindowState } from '../../shared/types';

export const MIN_WINDOW_WIDTH = 800;
export const MIN_WINDOW_HEIGHT = 600;
export const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  width: 1280,
  height: 800,
};

export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowStateSource {
  getBounds: () => WindowBounds;
  getNormalBounds: () => WindowBounds;
  isMaximized: () => boolean;
  isFullScreen: () => boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeBounds(bounds: WindowBounds | undefined, displays: DisplayWorkArea[]): WindowBounds {
  if (!bounds || !isFiniteNumber(bounds.width) || !isFiniteNumber(bounds.height)) {
    return DEFAULT_WINDOW_BOUNDS;
  }

  const normalized: WindowBounds = {
    width: Math.max(MIN_WINDOW_WIDTH, Math.round(bounds.width)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.round(bounds.height)),
  };

  if (isFiniteNumber(bounds.x) && isFiniteNumber(bounds.y)) {
    normalized.x = Math.round(bounds.x);
    normalized.y = Math.round(bounds.y);
  }

  if (normalized.x === undefined || normalized.y === undefined || displays.length === 0) {
    return normalized;
  }

  const positionedBounds = normalized as Required<WindowBounds>;
  return displays.some((display) => intersects(positionedBounds, display))
    ? normalized
    : DEFAULT_WINDOW_BOUNDS;
}

function intersects(bounds: Required<WindowBounds>, area: DisplayWorkArea): boolean {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  const areaRight = area.x + area.width;
  const areaBottom = area.y + area.height;

  return bounds.x < areaRight &&
    right > area.x &&
    bounds.y < areaBottom &&
    bottom > area.y;
}

export function normalizeWindowState(
  state: WindowState | null | undefined,
  displays: DisplayWorkArea[],
): Required<WindowState> {
  return {
    bounds: normalizeBounds(state?.bounds, displays),
    isMaximized: state?.isMaximized === true,
    isFullScreen: state?.isFullScreen === true,
  };
}

export function snapshotWindowState(win: WindowStateSource): Required<WindowState> {
  const isMaximized = win.isMaximized();
  const isFullScreen = win.isFullScreen();
  const bounds = isMaximized || isFullScreen ? win.getNormalBounds() : win.getBounds();

  return {
    bounds,
    isMaximized,
    isFullScreen,
  };
}
