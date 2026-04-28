import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app, Menu, Tray } from 'electron';
import { createTray, destroyTray } from '../tray';

const electronMocks = vi.hoisted(() => ({
  quit: vi.fn(),
  createFromPath: vi.fn((iconPath: string) => ({ iconPath })),
  buildFromTemplate: vi.fn((template: Array<Record<string, unknown>>) => template),
  trayDestroy: vi.fn(),
  traySetToolTip: vi.fn(),
  traySetContextMenu: vi.fn(),
  trayOn: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    quit: electronMocks.quit,
  },
  nativeImage: {
    createFromPath: electronMocks.createFromPath,
  },
  Menu: {
    buildFromTemplate: electronMocks.buildFromTemplate,
  },
  Tray: vi.fn(function Tray() {
    return {
      setToolTip: electronMocks.traySetToolTip,
      setContextMenu: electronMocks.traySetContextMenu,
      on: electronMocks.trayOn,
      destroy: electronMocks.trayDestroy,
    };
  }),
  BrowserWindow: class {},
}));

describe('createTray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroyTray();
  });

  it('lets before-quit run cleanup when Quit is clicked', () => {
    const mainWindow = {
      show: vi.fn(),
      focus: vi.fn(),
    };

    createTray(mainWindow as never);

    const template = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0] as Array<{
      label?: string;
      click?: () => void;
    }>;
    const quitItem = template.find((item) => item.label === 'Quit');

    expect(() => quitItem?.click?.()).not.toThrow();
    expect(app.quit).toHaveBeenCalledTimes(1);
    expect(Tray).toHaveBeenCalledTimes(1);
  });
});
