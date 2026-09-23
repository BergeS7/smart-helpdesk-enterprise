// Windows Forms/.NET Framework: bandeja sem console e coletor isolado em SYSTEM.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class AgentApp
{
    internal const string TaskName = "SmartHelpDesk Agent";
    internal static readonly string DataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "SmartHelpDeskAgent");
    internal static readonly string InstallDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "SmartHelpDeskAgent");

    [STAThread]
    private static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        try
        {
            // Abrir o .exe do pacote sem argumentos inicia a instalação; o ícone só é aberto por --tray.
            string mode = args.Length == 0 ? "--install" : args[0];
            if (mode == "--self-test") return SelfTest(args.Length > 1 ? args[1] : null);
            if (mode == "--collect") return Collect();
            if (mode == "--install-elevated") return SetupWizard.Run();
            if (mode == "--install") return Install();
            if (mode != "--tray") return 2;
            if (!IsRegistered()) return 0; // o ícone só aparece depois do cadastro concluído
            bool created;
            using (var mutex = new Mutex(true, "Local\\SmartHelpDeskTray", out created))
            {
                if (!created) return 0;
                using (var tray = new AgentTray()) Application.Run(tray);
                mutex.ReleaseMutex();
            }
            return 0;
        }
        catch (Exception)
        {
            if (args.Length == 0 || (args[0] != "--collect" && args[0] != "--self-test"))
                MessageBox.Show("Não foi possível iniciar o SmartHelpDesk. Reinstale o pacote ou contate a TI.", "SmartHelpDesk", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return 1;
        }
    }

    private static int Install()
    {
        // O processo original permanece no usuário que abriu o instalador; somente
        // o assistente é elevado. O ícone é iniciado pelo processo original.
        var start = ElevatedInstallerStart();
        try
        {
            using (var installer = Process.Start(start))
            {
                installer.WaitForExit();
                if (installer.ExitCode != 0) return installer.ExitCode;
            }
        }
        catch (System.ComponentModel.Win32Exception error)
        {
            if (error.NativeErrorCode == 1223) return 0; // usuário recusou o pedido de administrador
            throw;
        }
        var installed = Path.Combine(InstallDir, "SmartHelpDeskTray.exe");
        if (!File.Exists(installed) || !IsRegistered()) return 0; // instalação cancelada ou cadastro não concluído
        // --welcome: avisa onde o ícone ficou (o Windows costuma escondê-lo na seta ^).
        var tray = new ProcessStartInfo(installed, "--tray --welcome");
        tray.UseShellExecute = false;
        tray.CreateNoWindow = true;
        Process.Start(tray);
        return 0;
    }

    // Sem WindowStyle.Hidden: o Windows aplicaria esse modo à primeira janela do
    // processo elevado, e o assistente de cadastro abriria invisível.
    internal static ProcessStartInfo ElevatedInstallerStart()
    {
        var start = new ProcessStartInfo(Application.ExecutablePath, "--install-elevated");
        start.UseShellExecute = true;
        start.Verb = "runas";
        return start;
    }

    internal static ProcessStartInfo PowerShellStart(string script, string arguments)
    {
        var executable = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"WindowsPowerShell\v1.0\powershell.exe");
        var start = new ProcessStartInfo(executable, "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File \"" + script + "\" " + arguments);
        start.UseShellExecute = false;
        start.CreateNoWindow = true;
        start.WindowStyle = ProcessWindowStyle.Hidden;
        start.WorkingDirectory = Path.GetDirectoryName(script);
        return start;
    }

    private static int RunPowerShell(string script, string arguments)
    {
        using (var process = Process.Start(PowerShellStart(script, arguments)))
        {
            process.WaitForExit();
            return process.ExitCode;
        }
    }

    private static int Collect()
    {
        // Sem parâmetros fornecidos pelo usuário: lê somente a configuração
        // protegida e executa o coletor da instalação protegida.
        if (!WindowsIdentity.GetCurrent().IsSystem) return 5;
        var config = ReadJson(Path.Combine(DataDir, "agent.json"));
        bool insecure = config.ContainsKey("allowInsecureHttp") && config["allowInsecureHttp"] is bool && (bool)config["allowInsecureHttp"];
        return RunPowerShell(Path.Combine(InstallDir, "SmartHelpDeskAgent.ps1"), insecure ? "-AllowInsecureHttp" : "");
    }

    internal static Dictionary<string, object> ReadJson(string file)
    {
        if (!File.Exists(file)) return new Dictionary<string, object>();
        return new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(file)) ?? new Dictionary<string, object>();
    }

    internal static bool IsRegistered()
    {
        try { return IsRegistered(ReadJson(Path.Combine(DataDir, "status.json"))); }
        catch (Exception) { return false; }
    }

    // O agente só grava lastSuccessAt depois que o servidor confirmou o cadastro e o inventário.
    internal static bool IsRegistered(Dictionary<string, object> state)
    {
        return Date(state, "lastSuccessAt").HasValue;
    }

    internal static string Text(Dictionary<string, object> state, string key)
    {
        object value;
        return state.TryGetValue(key, out value) && value != null ? Convert.ToString(value, CultureInfo.InvariantCulture) : "";
    }

    internal static DateTimeOffset? Date(Dictionary<string, object> state, string key)
    {
        DateTimeOffset parsed;
        return DateTimeOffset.TryParse(Text(state, key), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out parsed) ? (DateTimeOffset?)parsed : null;
    }

    internal static string Status(Dictionary<string, object> state, DateTimeOffset now)
    {
        string status = Text(state, "state");
        var updated = Date(state, "updatedAt");
        if (status == "collecting") return updated.HasValue && (now - updated.Value).TotalMinutes < 12 ? "Enviando diagnóstico…" : "Coleta interrompida ou atrasada";
        if (status == "error") return "Falha no último envio";
        var success = Date(state, "lastSuccessAt");
        if (!success.HasValue) return "Aguardando primeiro envio";
        if ((now - success.Value).TotalHours > 30) return "Sem envio recente";
        return "Último envio confirmado";
    }

    internal static string Portal(Dictionary<string, object> state)
    {
        Uri uri;
        if (Uri.TryCreate(Text(state, "portalUrl"), UriKind.Absolute, out uri) &&
            (uri.Scheme == "https" || uri.Scheme == "http") && String.IsNullOrEmpty(uri.UserInfo)) return uri.AbsoluteUri;
        return "https://smart-helpdesk-enterprise.vercel.app/";
    }

    private static int SelfTest(string output)
    {
        int checks = 0;
        Action<bool> check = delegate(bool valid) { if (!valid) throw new InvalidOperationException("Self-test failed at " + checks); checks++; };
        var now = DateTimeOffset.UtcNow;
        var data = new Dictionary<string, object>();
        check(Status(data, now) == "Aguardando primeiro envio");
        check(!IsRegistered(data));
        data["lastSuccessAt"] = now.ToString("o");
        check(IsRegistered(data));
        check(Status(data, now) == "Último envio confirmado");
        check(Status(data, now.AddHours(31)) == "Sem envio recente");
        data["state"] = "error";
        check(Status(data, now) == "Falha no último envio");
        data["state"] = "collecting"; data["updatedAt"] = now.ToString("o");
        check(Status(data, now) == "Enviando diagnóstico…");
        check(Status(data, now.AddMinutes(13)) == "Coleta interrompida ou atrasada");
        data["portalUrl"] = "file:///C:/Windows/system32/cmd.exe";
        check(Portal(data).StartsWith("https://"));
        data["portalUrl"] = "https://example.test/suporte/";
        check(Portal(data) == "https://example.test/suporte/");
        var start = PowerShellStart(Path.Combine(InstallDir, "SmartHelpDeskAgent.ps1"), "");
        check(!start.UseShellExecute && start.CreateNoWindow && start.WindowStyle == ProcessWindowStyle.Hidden);
        check(ElevatedInstallerStart().WindowStyle == ProcessWindowStyle.Normal);
        using (var icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath)) check(icon != null);
        using (var context = new AgentTray()) check(context != null);
        if (output != null) File.WriteAllText(output, checks + " verificações OK: status, expiração, URL, processo sem console e menu de bandeja.");
        return 0;
    }

    internal sealed class AgentTray : ApplicationContext
    {
        private readonly NotifyIcon icon;
        private readonly Icon appIcon;
        private readonly ContextMenuStrip menu;
        private readonly ToolStripMenuItem statusItem;
        private readonly ToolStripMenuItem lastItem;
        private readonly ToolStripMenuItem sendItem;
        private readonly System.Windows.Forms.Timer timer;
        private Dictionary<string, object> state = new Dictionary<string, object>();
        private DateTimeOffset requestedAt = DateTimeOffset.MinValue;

        internal AgentTray()
        {
            appIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            menu = new ContextMenuStrip();
            menu.Items.Add(new ToolStripMenuItem("SmartHelpDesk") { Enabled = false });
            statusItem = new ToolStripMenuItem("Consultando status…") { Enabled = false };
            lastItem = new ToolStripMenuItem("Último envio: —") { Enabled = false };
            menu.Items.Add(statusItem); menu.Items.Add(lastItem); menu.Items.Add(new ToolStripSeparator());
            sendItem = new ToolStripMenuItem("Enviar diagnóstico agora", null, delegate { RequestReport(); });
            menu.Items.Add(sendItem);
            menu.Items.Add("Abrir SmartHelpDesk", null, delegate { OpenPortal(); });
            menu.Items.Add("Detalhes do agente", null, delegate { ShowDetails(); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Fechar ícone (coleta continua)", null, delegate { ExitThread(); });
            icon = new NotifyIcon { Icon = appIcon, Text = "SmartHelpDesk", ContextMenuStrip = menu };
            icon.DoubleClick += delegate { OpenPortal(); };
            RefreshState();
            // Self-test cria e valida o menu sem exibir um ícone na área do usuário.
            icon.Visible = Array.IndexOf(Environment.GetCommandLineArgs(), "--self-test") < 0;
            if (icon.Visible && Array.IndexOf(Environment.GetCommandLineArgs(), "--welcome") >= 0)
                icon.ShowBalloonTip(8000, "SmartHelpDesk ativo", "Computador cadastrado. O SmartHelpDesk fica aqui perto do relógio; se não aparecer, clique na seta ^.", ToolTipIcon.Info);
            timer = new System.Windows.Forms.Timer { Interval = 5000 };
            timer.Tick += delegate { RefreshState(); };
            timer.Start();
        }

        private void RefreshState()
        {
            try { state = ReadJson(Path.Combine(DataDir, "status.json")); }
            catch (IOException) { return; } // arquivo sendo substituído; mantém o estado anterior
            catch (UnauthorizedAccessException) { statusItem.Text = "Reinstalação necessária: status inacessível"; return; }
            catch (ArgumentException) { statusItem.Text = "Status temporariamente indisponível"; return; }
            string status = Status(state, DateTimeOffset.UtcNow);
            bool pending = (DateTimeOffset.UtcNow - requestedAt).TotalSeconds < 20;
            statusItem.Text = pending ? "Diagnóstico solicitado…" : status;
            var last = Date(state, "lastSuccessAt");
            lastItem.Text = "Último envio: " + (last.HasValue ? last.Value.LocalDateTime.ToString("dd/MM/yyyy HH:mm") : "ainda não confirmado");
            sendItem.Enabled = !pending && status != "Enviando diagnóstico…";
            icon.Text = ("SmartHelpDesk · " + status).Length <= 63 ? "SmartHelpDesk · " + status : "SmartHelpDesk";
        }

        private void RequestReport()
        {
            object scheduler = null, folder = null, task = null, running = null;
            try
            {
                scheduler = Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));
                ((dynamic)scheduler).Connect();
                folder = ((dynamic)scheduler).GetFolder("\\");
                task = ((dynamic)folder).GetTask(TaskName);
                running = ((dynamic)task).Run(null);
                requestedAt = DateTimeOffset.UtcNow;
                RefreshState();
                icon.ShowBalloonTip(3000, "SmartHelpDesk", "Diagnóstico solicitado. O resultado aparecerá no ícone após o envio.", ToolTipIcon.Info);
            }
            catch (Exception)
            {
                MessageBox.Show("Não foi possível acionar a coleta. A TI precisa instalar a versão com ícone e conferir a tarefa SmartHelpDesk Agent.", "SmartHelpDesk", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            finally
            {
                foreach (var item in new object[] { running, task, folder, scheduler }) if (item != null && Marshal.IsComObject(item)) Marshal.FinalReleaseComObject(item);
            }
        }

        private void OpenPortal()
        {
            try { Process.Start(new ProcessStartInfo(Portal(state)) { UseShellExecute = true }); }
            catch (Exception) { MessageBox.Show("Abra o SmartHelpDesk no navegador padrão.", "SmartHelpDesk"); }
        }

        private void ShowDetails()
        {
            MessageBox.Show(statusItem.Text + "\n" + lastItem.Text + "\n\nVersão: " + Text(state, "agentVersion") +
                "\nColeta automática: ao iniciar o Windows e às 15h." +
                "\nO status reflete o último envio, não uma conexão em tempo real." +
                "\nFechar o ícone não interrompe a coleta.", "SmartHelpDesk Agent", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { timer.Stop(); timer.Dispose(); icon.Visible = false; icon.Dispose(); menu.Dispose(); appIcon.Dispose(); }
            base.Dispose(disposing);
        }
    }
}
