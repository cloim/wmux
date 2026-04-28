import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { ipcMain } from 'electron';
import { IPC } from '../../../../shared/constants';
import { registerPTYHandlers } from '../pty.handler';

vi.mock('electron', () => ({
  ipcMain: {
    removeHandler: vi.fn(),
    handle: vi.fn(),
    removeAllListeners: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: class {},
}));

describe('registerPTYHandlers daemon notifications', () => {
  it('forwards daemon idle activity events to renderer notifications', () => {
    const daemonClient = new EventEmitter() as EventEmitter & {
      isConnected: boolean;
      rpc: ReturnType<typeof vi.fn>;
      connectSessionPipe: ReturnType<typeof vi.fn>;
      disconnectSessionPipe: ReturnType<typeof vi.fn>;
      writeToSession: ReturnType<typeof vi.fn>;
    };
    daemonClient.isConnected = true;
    daemonClient.rpc = vi.fn();
    daemonClient.connectSessionPipe = vi.fn();
    daemonClient.disconnectSessionPipe = vi.fn();
    daemonClient.writeToSession = vi.fn();

    const send = vi.fn();
    const cleanup = registerPTYHandlers(
      {} as never,
      {} as never,
      daemonClient as never,
      () => ({
        isDestroyed: () => false,
        webContents: { send },
      }) as never,
    );

    daemonClient.emit('event', {
      type: 'activity.idle',
      sessionId: 'daemon-test',
      data: null,
    });

    expect(send).toHaveBeenCalledWith(IPC.NOTIFICATION, 'daemon-test', {
      type: 'agent',
      title: 'Task may have finished',
      body: 'Terminal output stopped after active period',
    });

    cleanup();
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC.PTY_CREATE);
  });
});
