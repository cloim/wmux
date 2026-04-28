import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

function createDaemonClient() {
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
  return daemonClient;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerPTYHandlers daemon notifications', () => {
  it('forwards daemon idle activity events to renderer notifications', () => {
    const daemonClient = createDaemonClient();

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

  it('forwards daemon OSC 7 cwd reports to the renderer as normalized Windows cwd changes', async () => {
    const daemonClient = createDaemonClient();
    daemonClient.rpc = vi.fn(async (method: string) => {
      if (method === 'daemon.createSession') return { pid: 1234 };
      return {};
    });
    daemonClient.connectSessionPipe = vi.fn(async () => undefined);

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

    const createHandler = vi.mocked(ipcMain.handle).mock.calls
      .find(([channel]) => channel === IPC.PTY_CREATE)?.[1];
    if (!createHandler) throw new Error('PTY_CREATE handler not registered');

    const result = await createHandler({} as never, { shell: 'pwsh.exe', cwd: process.cwd() }) as { id: string };
    daemonClient.emit('session:data', {
      sessionId: result.id,
      data: Buffer.from('\x1b]7;file://MYPC/D:/PROJECTS/wmux\x07'),
    });

    expect(send).toHaveBeenCalledWith(IPC.CWD_CHANGED, result.id, 'D:\\PROJECTS\\wmux');

    cleanup();
  });
});
