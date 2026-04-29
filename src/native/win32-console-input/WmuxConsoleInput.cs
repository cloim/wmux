using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

internal static class WmuxConsoleInput
{
    private const ushort KEY_EVENT = 0x0001;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const ushort VK_RETURN = 0x0D;
    private const ushort VK_TAB = 0x09;
    private const ushort VK_PACKET = 0xE7;
    private const uint SHIFT_PRESSED = 0x0010;
    private static readonly IntPtr INVALID_HANDLE_VALUE = new IntPtr(-1);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct KEY_EVENT_RECORD
    {
        [MarshalAs(UnmanagedType.Bool)]
        public bool bKeyDown;
        public ushort wRepeatCount;
        public ushort wVirtualKeyCode;
        public ushort wVirtualScanCode;
        public char UnicodeChar;
        public uint dwControlKeyState;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    private struct INPUT_RECORD
    {
        [FieldOffset(0)]
        public ushort EventType;

        [FieldOffset(4)]
        public KEY_EVENT_RECORD KeyEvent;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(uint dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateFileW(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool WriteConsoleInputW(
        IntPtr hConsoleInput,
        INPUT_RECORD[] lpBuffer,
        uint nLength,
        out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    private static int Main(string[] args)
    {
        try
        {
            var pid = 0U;
            string payload = null;
            var shiftEnter = false;

            for (var i = 0; i < args.Length; i++)
            {
                if (args[i] == "--pid" && i + 1 < args.Length)
                {
                    pid = UInt32.Parse(args[++i]);
                }
                else if (args[i] == "--utf16-base64" && i + 1 < args.Length)
                {
                    payload = args[++i];
                }
                else if (args[i] == "--shift-enter")
                {
                    shiftEnter = true;
                }
            }

            if (pid == 0 || (!shiftEnter && String.IsNullOrEmpty(payload)))
            {
                Console.Error.WriteLine("Usage: wmux-console-input.exe --pid <pid> (--utf16-base64 <text> | --shift-enter)");
                return 2;
            }

            var text = shiftEnter ? null : Encoding.Unicode.GetString(Convert.FromBase64String(payload));
            if (!shiftEnter && text.Length == 0)
            {
                return 0;
            }

            FreeConsole();
            if (!AttachConsole(pid))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "AttachConsole failed");
            }

            var input = CreateFileW(
                "CONIN$",
                GENERIC_WRITE,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                IntPtr.Zero,
                OPEN_EXISTING,
                0,
                IntPtr.Zero);

            if (input == INVALID_HANDLE_VALUE)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFile(CONIN$) failed");
            }

            try
            {
                if (shiftEnter)
                {
                    WriteBatch(input, BuildShiftEnter());
                }
                else foreach (var batch in BuildBatches(text, 128))
                {
                    WriteBatch(input, batch);
                }
            }
            finally
            {
                CloseHandle(input);
            }

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void WriteBatch(IntPtr input, INPUT_RECORD[] batch)
    {
        uint written;
        if (!WriteConsoleInputW(input, batch, (uint)batch.Length, out written))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "WriteConsoleInput failed");
        }
        if (written != batch.Length)
        {
            throw new InvalidOperationException("WriteConsoleInput wrote fewer records than requested");
        }
    }

    private static INPUT_RECORD[] BuildShiftEnter()
    {
        var records = new List<INPUT_RECORD>(2);
        AddKey(records, '\r', true, SHIFT_PRESSED);
        AddKey(records, '\r', false, SHIFT_PRESSED);
        return records.ToArray();
    }

    private static IEnumerable<INPUT_RECORD[]> BuildBatches(string text, int charsPerBatch)
    {
        var records = new List<INPUT_RECORD>(charsPerBatch * 2);

        for (var i = 0; i < text.Length; i++)
        {
            var ch = text[i];
            if (ch == '\n')
            {
                if (i > 0 && text[i - 1] == '\r')
                {
                    continue;
                }
                ch = '\r';
            }

            AddKey(records, ch, true, 0);
            AddKey(records, ch, false, 0);

            if (records.Count >= charsPerBatch * 2)
            {
                yield return records.ToArray();
                records.Clear();
            }
        }

        if (records.Count > 0)
        {
            yield return records.ToArray();
        }
    }

    private static void AddKey(List<INPUT_RECORD> records, char ch, bool keyDown, uint controlKeyState)
    {
        records.Add(new INPUT_RECORD
        {
            EventType = KEY_EVENT,
            KeyEvent = new KEY_EVENT_RECORD
            {
                bKeyDown = keyDown,
                wRepeatCount = 1,
                wVirtualKeyCode = VirtualKeyFor(ch),
                wVirtualScanCode = 0,
                UnicodeChar = ch,
                dwControlKeyState = controlKeyState,
            },
        });
    }

    private static ushort VirtualKeyFor(char ch)
    {
        if (ch == '\r') return VK_RETURN;
        if (ch == '\t') return VK_TAB;
        return VK_PACKET;
    }
}
