using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using UnityEngine;

public class DesktopWindowPinner : MonoBehaviour
{
    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    private static readonly IntPtr HWND_BOTTOM = new IntPtr(1);
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOACTIVATE = 0x0010;

    private IntPtr windowHandle = IntPtr.Zero;

    void Start()
    {
        // Only meaningful in an actual Windows build — the Unity Editor is
        // its own window, not the game's window, so this quietly does
        // nothing while you're testing via Play Mode in the Editor.
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
        windowHandle = Process.GetCurrentProcess().MainWindowHandle;
#endif
    }

    void Update()
    {
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
        if (windowHandle == IntPtr.Zero) return;

        // Only push to the bottom when this ISN'T the window you're
        // currently focused on. If we did this unconditionally every
        // frame, it would fight you the moment you tried to click into
        // the chat panel or an approve/reject button.
        if (GetForegroundWindow() != windowHandle)
        {
            SetWindowPos(windowHandle, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        }
#endif
    }
}