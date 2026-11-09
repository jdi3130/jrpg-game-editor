using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace JRPGMapEditor
{
    static class Program
    {
        private static TcpListener listener;
        private static string rootDir;
        private static int port = 4173;
        private static volatile bool isRunning = true;
        private static NotifyIcon trayIcon;
        private static string editorUrl;
        private static string logFile;

        static void Log(string msg)
        {
            try
            {
                File.AppendAllText(logFile, string.Format("[{0:HH:mm:ss}] {1}\r\n", DateTime.Now, msg));
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            logFile = Path.Combine(baseDir, "MapEditor.log");
            File.WriteAllText(logFile, "Starting MapEditor...\r\n");

            // 1. Check if server is already running on port 4173
            bool alreadyRunning = false;
            try
            {
                using (TcpClient test = new TcpClient())
                {
                    IAsyncResult ar = test.BeginConnect(IPAddress.Loopback, 4173, null, null);
                    if (ar.AsyncWaitHandle.WaitOne(400))
                    {
                        test.EndConnect(ar);
                        alreadyRunning = true;
                    }
                }
            }
            catch { }

            editorUrl = "http://127.0.0.1:4173/editor/map-editor.html";

            if (alreadyRunning)
            {
                Log("Server already active on 4173. Opening app window and exiting launcher instance.");
                LaunchAppWindow();
                return;
            }

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                if (Directory.Exists(Path.Combine(baseDir, "editor")))
                {
                    rootDir = baseDir;
                }
                else if (Directory.Exists(Path.Combine(baseDir, "..", "editor")))
                {
                    rootDir = Path.GetFullPath(Path.Combine(baseDir, ".."));
                }
                else
                {
                    rootDir = Directory.GetCurrentDirectory();
                }

                Log("RootDir: " + rootDir);
                StartServer();
                Log("Server listening on port: " + port);

                editorUrl = string.Format("http://127.0.0.1:{0}/editor/map-editor.html", port);
                LaunchAppWindow();

                // Setup Tray Icon in Windows taskbar
                trayIcon = new NotifyIcon();
                trayIcon.Icon = SystemIcons.Application;
                trayIcon.Text = "JRPG Map Editor (запущен)";
                trayIcon.Visible = true;

                ContextMenu menu = new ContextMenu();
                menu.MenuItems.Add("Открыть окно редактора", delegate { LaunchAppWindow(); });
                menu.MenuItems.Add("-");
                menu.MenuItems.Add("Выход", delegate {
                    Log("User clicked Exit.");
                    isRunning = false;
                    trayIcon.Visible = false;
                    try { listener.Stop(); } catch { }
                    Application.Exit();
                });
                trayIcon.ContextMenu = menu;
                trayIcon.DoubleClick += delegate { LaunchAppWindow(); };

                Log("Entering Application.Run()...");
                Application.Run();
            }
            catch (Exception ex)
            {
                Log("MAIN EXCEPTION: " + ex.ToString());
                MessageBox.Show("Ошибка: " + ex.Message, "JRPG Map Editor", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                isRunning = false;
                if (trayIcon != null) trayIcon.Visible = false;
                try { if (listener != null) listener.Stop(); } catch { }
                Log("Main ended.");
            }
        }

        static void LaunchAppWindow()
        {
            // 1. Try Chrome App Mode
            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath))
            {
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            if (File.Exists(chromePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = chromePath;
                psi.Arguments = string.Format("--app=\"{0}\"", editorUrl);
                psi.UseShellExecute = false;
                try
                {
                    Process.Start(psi);
                    Log("Launched in Chrome App Mode.");
                    return;
                }
                catch (Exception ex)
                {
                    Log("Chrome launch failed: " + ex.Message);
                }
            }

            // 2. Try Edge App Mode
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            if (File.Exists(edgePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = edgePath;
                psi.Arguments = string.Format("--app=\"{0}\"", editorUrl);
                psi.UseShellExecute = false;
                try
                {
                    Process.Start(psi);
                    Log("Launched in Edge App Mode.");
                    return;
                }
                catch (Exception ex)
                {
                    Log("Edge launch failed: " + ex.Message);
                }
            }

            // 3. Fallback: Default Browser
            Log("Opening via system default handler.");
            Process.Start(editorUrl);
        }

        static void StartServer()
        {
            ThreadPool.SetMinThreads(32, 32);

            for (int p = 4173; p < 4220; p++)
            {
                try
                {
                    TcpListener l = new TcpListener(IPAddress.Loopback, p);
                    l.Start(100);
                    listener = l;
                    port = p;
                    break;
                }
                catch { }
            }

            if (listener == null)
            {
                Log("FATAL: Could not bind TcpListener to any port!");
                return;
            }

            ThreadPool.QueueUserWorkItem(delegate
            {
                while (isRunning)
                {
                    try
                    {
                        TcpClient client = listener.AcceptTcpClient();
                        ThreadPool.QueueUserWorkItem(delegate { HandleClient(client); });
                    }
                    catch { if (!isRunning) break; }
                }
            });
        }

        static void HandleClient(TcpClient client)
        {
            try
            {
                using (NetworkStream stream = client.GetStream())
                {
                    byte[] buf = new byte[8192];
                    int bytesRead = stream.Read(buf, 0, buf.Length);
                    if (bytesRead <= 0) return;

                    string req = Encoding.UTF8.GetString(buf, 0, bytesRead);
                    string[] lines = req.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.None);
                    if (lines.Length < 1) return;
                    string[] parts = lines[0].Split(' ');
                    if (parts.Length < 2) return;
                    string path = parts[1].TrimStart('/');
                    int qIdx = path.IndexOf('?');
                    if (qIdx >= 0) path = path.Substring(0, qIdx);
                    if (string.IsNullOrEmpty(path)) path = "editor/map-editor.html";

                    if (path.Equals("heartbeat", StringComparison.OrdinalIgnoreCase))
                    {
                        byte[] ok = Encoding.UTF8.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok");
                        stream.Write(ok, 0, ok.Length);
                        return;
                    }

                    string filePath = Path.Combine(rootDir, Uri.UnescapeDataString(path).Replace('/', Path.DirectorySeparatorChar));
                    if (File.Exists(filePath))
                    {
                        byte[] body = File.ReadAllBytes(filePath);
                        string mime = GetMimeType(filePath);
                        string header = string.Format("HTTP/1.1 200 OK\r\nContent-Type: {0}\r\nContent-Length: {1}\r\nConnection: close\r\nCache-Control: no-cache\r\n\r\n", mime, body.Length);
                        byte[] hBytes = Encoding.UTF8.GetBytes(header);
                        stream.Write(hBytes, 0, hBytes.Length);
                        stream.Write(body, 0, body.Length);
                    }
                    else
                    {
                        byte[] notFound = Encoding.UTF8.GetBytes("HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot found");
                        stream.Write(notFound, 0, notFound.Length);
                    }
                }
            }
            catch { }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".gif": return "image/gif";
                case ".svg": return "image/svg+xml";
                case ".woff2": return "font/woff2";
                case ".woff": return "font/woff";
                case ".ttf": return "font/ttf";
                default: return "application/octet-stream";
            }
        }
    }
}
