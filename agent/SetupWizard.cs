// Assistente de cadastro: o próprio executável traz os scripts do agente embutidos,
// então um único arquivo com o logo instala, cadastra e deixa o ícone na bandeja.
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal sealed class AgentLocation
{
    internal string Name, Municipality, NetworkPrefix;
    internal double Latitude, Longitude;
    public override string ToString() { return Name; }
}

// Regras sem interface: validação, comunicação com a API e instalação.
internal static class AgentSetup
{
    internal static readonly string[] EmbeddedFiles = { "SmartHelpDeskAgent.ps1", "Install-Tray.ps1", "update-public-key.xml" };

    internal static byte[] ResourceBytes(string name)
    {
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        {
            if (stream == null) return null;
            using (var memory = new MemoryStream()) { stream.CopyTo(memory); return memory.ToArray(); }
        }
    }

    internal static string DefaultServer()
    {
        var bytes = ResourceBytes("server-url.txt");
        return bytes == null ? "" : Encoding.UTF8.GetString(bytes).Trim().TrimStart('\uFEFF');
    }

    // Mesmas regras de Normalize-ServerUrl em SmartHelpDeskAgent.ps1.
    internal static string NormalizeServer(string value, out Uri uri)
    {
        if (!Uri.TryCreate((value ?? "").Trim(), UriKind.Absolute, out uri) || (uri.Scheme != "https" && uri.Scheme != "http") ||
            !String.IsNullOrEmpty(uri.UserInfo) || !String.IsNullOrEmpty(uri.Query) || !String.IsNullOrEmpty(uri.Fragment))
            throw new InvalidOperationException("Endereço do servidor inválido.");
        if (!uri.AbsolutePath.TrimEnd('/').EndsWith("/api/assets", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("O endereço do servidor deve terminar em /api/assets.");
        if (uri.Scheme == "http" && !IsPrivateHost(uri.Host))
            throw new InvalidOperationException("Fora da rede local o servidor precisa usar HTTPS.");
        return uri.AbsoluteUri.TrimEnd('/');
    }

    internal static bool IsPrivateHost(string host)
    {
        return host == "localhost" || host == "127.0.0.1" || Regex.IsMatch(host, @"^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)");
    }

    // Aceita só o código ou o comando inteiro copiado do painel (que também traz o servidor).
    internal static string ParseInvite(string text, ref string server)
    {
        text = (text ?? "").Trim();
        var serverMatch = Regex.Match(text, "-ServerUrl\\s+\"([^\"]+)\"", RegexOptions.IgnoreCase);
        if (serverMatch.Success) server = serverMatch.Groups[1].Value;
        var keyMatch = Regex.Match(text, "-EnrollmentKey\\s+\"?([^\"\\s]+)\"?", RegexOptions.IgnoreCase);
        var code = keyMatch.Success ? keyMatch.Groups[1].Value : text;
        if (!Regex.IsMatch(code, "^[A-Za-z0-9_-]{16,128}$")) throw new InvalidOperationException("Código de convite inválido. Copie o código completo gerado no painel.");
        return code;
    }

    internal static List<AgentLocation> FetchLocations(string server, string code)
    {
        ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        var request = (HttpWebRequest)WebRequest.Create(server + "/agent/locations");
        request.Method = "GET";
        request.Accept = "application/json";
        request.Timeout = 90000; // servidor gratuito pode levar ~1 minuto para "acordar"
        request.Headers["X-Agent-Enrollment"] = code;
        string body, contentType;
        try
        {
            using (var response = (HttpWebResponse)request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
            {
                body = reader.ReadToEnd();
                contentType = response.ContentType ?? "";
            }
        }
        catch (WebException error)
        {
            var response = error.Response as HttpWebResponse;
            if (response == null) throw new InvalidOperationException("Não foi possível conectar ao servidor. Verifique a internet e tente novamente.");
            int status = (int)response.StatusCode;
            if (status == 401 || status == 403) throw new InvalidOperationException("Convite inválido, expirado ou já utilizado. Gere um novo convite no painel.");
            if (status == 429) throw new InvalidOperationException("Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.");
            if (status == 404) throw new InvalidOperationException("Esse endereço não é a API do SmartHelpDesk. Confira o servidor.");
            throw new InvalidOperationException("O servidor respondeu com erro " + status + ". Tente novamente em instantes.");
        }
        if (contentType.IndexOf("json", StringComparison.OrdinalIgnoreCase) < 0) throw new InvalidOperationException("Esse endereço não é a API do SmartHelpDesk. Confira o servidor.");
        var rows = new JavaScriptSerializer().Deserialize<List<Dictionary<string, object>>>(body) ?? new List<Dictionary<string, object>>();
        var result = new List<AgentLocation>();
        foreach (var row in rows)
        {
            var location = new AgentLocation
            {
                Name = Text(row, "nome"), Municipality = Text(row, "municipio"), NetworkPrefix = Text(row, "rede_prefixo"),
                Latitude = Number(row, "latitude"), Longitude = Number(row, "longitude"),
            };
            if (location.Name.Length > 0 && location.Municipality.Length > 0 && location.Latitude != 0 && location.Longitude != 0) result.Add(location);
        }
        if (result.Count == 0) throw new InvalidOperationException("Nenhuma unidade cadastrada no servidor. Avise a TI.");
        return result;
    }

    private static string Text(Dictionary<string, object> row, string key)
    {
        object value;
        return row.TryGetValue(key, out value) && value != null ? Convert.ToString(value, CultureInfo.InvariantCulture).Trim() : "";
    }

    private static double Number(Dictionary<string, object> row, string key)
    {
        double parsed;
        return Double.TryParse(Text(row, key), NumberStyles.Float, CultureInfo.InvariantCulture, out parsed) ? parsed : 0;
    }

    // Sugere a unidade pelo prefixo de rede cadastrado (ex.: 192.168.10.).
    internal static AgentLocation Detect(List<AgentLocation> locations)
    {
        var addresses = new List<string>();
        try
        {
            foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (adapter.OperationalStatus != OperationalStatus.Up) continue;
                foreach (var address in adapter.GetIPProperties().UnicastAddresses)
                    if (address.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(address.Address)) addresses.Add(address.Address.ToString());
            }
        }
        catch (NetworkInformationException) { return null; }
        foreach (var location in locations)
        {
            if (String.IsNullOrEmpty(location.NetworkPrefix)) continue;
            foreach (var address in addresses) if (address.StartsWith(location.NetworkPrefix, StringComparison.Ordinal)) return location;
        }
        return null;
    }

    // Grava os arquivos direto em Program Files (gravável só por administradores),
    // para que o PowerShell elevado nunca execute um script de pasta do usuário.
    internal static void DeployFiles()
    {
        Directory.CreateDirectory(AgentApp.InstallDir);
        var target = Path.Combine(AgentApp.InstallDir, "SmartHelpDeskTray.exe");
        int self = Process.GetCurrentProcess().Id;
        foreach (var process in Process.GetProcessesByName("SmartHelpDeskTray"))
        {
            try
            {
                if (process.Id != self && String.Equals(process.MainModule.FileName, target, StringComparison.OrdinalIgnoreCase)) { process.Kill(); process.WaitForExit(5000); }
            }
            catch (Win32Exception) { }
            catch (InvalidOperationException) { }
            finally { process.Dispose(); }
        }
        foreach (var name in EmbeddedFiles)
        {
            var bytes = ResourceBytes(name);
            if (bytes == null)
            {
                if (name == "update-public-key.xml") continue; // opcional: sem ela não há atualização automática
                throw new InvalidOperationException("Instalador incompleto: " + name + " ausente. Gere-o novamente com Build-Agent.ps1.");
            }
            WriteReplacing(Path.Combine(AgentApp.InstallDir, name), bytes);
        }
        if (!String.Equals(Path.GetFullPath(Application.ExecutablePath), Path.GetFullPath(target), StringComparison.OrdinalIgnoreCase))
            WriteReplacing(target, File.ReadAllBytes(Application.ExecutablePath));
    }

    // Um .exe em uso (ex.: coleta em andamento) não pode ser sobrescrito, mas pode ser renomeado.
    private static void WriteReplacing(string path, byte[] bytes)
    {
        try { File.WriteAllBytes(path, bytes); }
        catch (IOException)
        {
            if (!File.Exists(path)) throw;
            File.Move(path, path + "." + Guid.NewGuid().ToString("N") + ".old");
            File.WriteAllBytes(path, bytes);
        }
    }

    private static string Quote(string value)
    {
        if (value.IndexOf('"') >= 0) throw new InvalidOperationException("Valor inválido recebido do servidor.");
        return "\"" + value + "\"";
    }

    // Executa o mesmo SmartHelpDeskAgent.ps1 -Install usado pela instalação manual.
    internal static string RunInstall(string server, string code, AgentLocation location, bool insecure)
    {
        DeployFiles();
        var arguments = "-ServerUrl " + Quote(server) + " -EnrollmentKey " + Quote(code) + " -Municipio " + Quote(location.Municipality) +
            " -Unidade " + Quote(location.Name) + " -Latitude:" + location.Latitude.ToString("R", CultureInfo.InvariantCulture) +
            " -Longitude:" + location.Longitude.ToString("R", CultureInfo.InvariantCulture) + " -Install" + (insecure ? " -AllowInsecureHttp" : "");
        var start = AgentApp.PowerShellStart(Path.Combine(AgentApp.InstallDir, "SmartHelpDeskAgent.ps1"), arguments);
        start.RedirectStandardOutput = true;
        start.RedirectStandardError = true;
        var console = Encoding.GetEncoding(CultureInfo.CurrentCulture.TextInfo.OEMCodePage);
        start.StandardOutputEncoding = console;
        start.StandardErrorEncoding = console;
        using (var process = Process.Start(start))
        {
            var output = process.StandardOutput.ReadToEndAsync();
            var errors = process.StandardError.ReadToEndAsync();
            if (!process.WaitForExit(15 * 60 * 1000)) { try { process.Kill(); } catch (InvalidOperationException) { } return "A instalação demorou demais e foi interrompida."; }
            process.WaitForExit();
            if (process.ExitCode == 0 && AgentApp.IsRegistered()) return null;
            foreach (var line in errors.Result.Split('\n'))
                if (line.Trim().Length > 0) return line.Trim();
            return "O cadastro não foi confirmado pelo servidor.";
        }
    }
}

internal sealed class SetupWizard : Form
{
    private static readonly Color Navy = Color.FromArgb(0x13, 0x3A, 0x5B);
    private static readonly Color Muted = Color.FromArgb(0x55, 0x61, 0x70);
    private static readonly Color Danger = Color.FromArgb(0xB4, 0x23, 0x18);
    private readonly Panel body = new Panel();
    private readonly Button primary = new Button();
    private readonly Button secondary = new Button();
    private readonly Image logo;
    private string server = AgentSetup.DefaultServer();
    private string inviteText = "";
    private string code;
    private bool insecure;
    private bool busy;
    private List<AgentLocation> locations;
    private AgentLocation chosen;
    private Action onPrimary, onSecondary;

    internal static int Run()
    {
        if (!new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator))
        {
            MessageBox.Show("O cadastro precisa da permissão de administrador do Windows.", "SmartHelpDesk", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return 1;
        }
        using (var wizard = new SetupWizard()) return wizard.ShowDialog() == DialogResult.OK ? 0 : 1;
    }

    internal SetupWizard()
    {
        var logoBytes = AgentSetup.ResourceBytes("SmartHelpDesk-logo.png");
        if (logoBytes != null) logo = Image.FromStream(new MemoryStream(logoBytes));
        AutoScaleDimensions = new SizeF(96F, 96F);
        AutoScaleMode = AutoScaleMode.Dpi;
        Text = "SmartHelpDesk";
        Font = new Font("Segoe UI", 9.75F);
        ClientSize = new Size(480, 540);
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch (ArgumentException) { }

        var header = new Panel { Bounds = new Rectangle(0, 0, 480, 124), BackColor = Navy };
        header.Paint += delegate(object sender, PaintEventArgs e)
        {
            e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            float scale = e.Graphics.DpiX / 96F;
            if (logo != null) e.Graphics.DrawImage(logo, 28 * scale, 32 * scale, 60 * scale, 60 * scale);
        };
        header.Controls.Add(MakeLabel("SmartHelpDesk", 104, 36, 340, 34, new Font("Segoe UI Semibold", 17F), Color.White));
        header.Controls.Add(MakeLabel("Cadastro deste computador", 106, 70, 340, 22, new Font("Segoe UI", 10F), Color.FromArgb(0xC9, 0xD6, 0xE3)));
        Controls.Add(header);

        body.Bounds = new Rectangle(0, 124, 480, 348);
        Controls.Add(body);

        var footer = new Panel { Bounds = new Rectangle(0, 472, 480, 68), BackColor = Color.FromArgb(0xF6, 0xF8, 0xFA) };
        footer.Paint += delegate(object sender, PaintEventArgs e) { e.Graphics.DrawLine(new Pen(Color.FromArgb(0xE2, 0xE8, 0xF0)), 0, 0, footer.Width, 0); };
        primary.Bounds = new Rectangle(262, 16, 190, 38);
        primary.FlatStyle = FlatStyle.Flat;
        primary.FlatAppearance.BorderSize = 0;
        primary.BackColor = Navy;
        primary.ForeColor = Color.White;
        primary.Font = new Font("Segoe UI Semibold", 10F);
        primary.Cursor = Cursors.Hand;
        primary.EnabledChanged += delegate { primary.BackColor = primary.Enabled ? Navy : Color.FromArgb(0x9A, 0xAE, 0xC2); };
        primary.Click += delegate { if (onPrimary != null) onPrimary(); };
        secondary.Bounds = new Rectangle(146, 16, 106, 38);
        secondary.FlatStyle = FlatStyle.Flat;
        secondary.FlatAppearance.BorderColor = Color.FromArgb(0xCB, 0xD5, 0xE1);
        secondary.BackColor = Color.White;
        secondary.ForeColor = Navy;
        secondary.Cursor = Cursors.Hand;
        secondary.Click += delegate { if (onSecondary != null) onSecondary(); };
        footer.Controls.Add(primary);
        footer.Controls.Add(secondary);
        Controls.Add(footer);
        AcceptButton = primary;
        FormClosing += delegate(object sender, FormClosingEventArgs e) { if (busy) e.Cancel = true; };
        ShowCodePage(null);
    }

    private static Label MakeLabel(string text, int x, int y, int width, int height, Font font, Color color)
    {
        return new Label { Text = text, Bounds = new Rectangle(x, y, width, height), Font = font, ForeColor = color, BackColor = Color.Transparent };
    }

    private void Buttons(string primaryText, Action primaryAction, string secondaryText, Action secondaryAction)
    {
        primary.Text = primaryText;
        onPrimary = primaryAction;
        primary.Visible = primaryText != null;
        primary.Enabled = true;
        secondary.Text = secondaryText;
        onSecondary = secondaryAction;
        secondary.Visible = secondaryText != null;
    }

    private void Reset(string step, string title, string description)
    {
        body.Controls.Clear();
        if (step != null) body.Controls.Add(MakeLabel(step, 28, 22, 424, 20, new Font("Segoe UI", 9F), Muted));
        body.Controls.Add(MakeLabel(title, 26, 42, 428, 30, new Font("Segoe UI Semibold", 13.5F), Color.FromArgb(0x0F, 0x17, 0x2A)));
        if (description != null) body.Controls.Add(MakeLabel(description, 28, 74, 424, 44, new Font("Segoe UI", 9.5F), Muted));
    }

    private void ShowCodePage(string error)
    {
        Reset("Etapa 1 de 2", "Cole o código de convite", "A TI gera o código em Ativos › Gerar convite do agente. Ele vale por 2 horas e serve para um computador.");
        var input = new TextBox { Bounds = new Rectangle(28, 128, 424, 30), Font = new Font("Consolas", 12F), Text = inviteText };
        body.Controls.Add(input);
        var errorLabel = MakeLabel(error ?? "", 28, 166, 424, 44, new Font("Segoe UI", 9.25F), Danger);
        body.Controls.Add(errorLabel);
        var serverBox = new TextBox { Bounds = new Rectangle(28, 262, 424, 26), Text = server, Visible = server.Length == 0 };
        var serverLabel = MakeLabel("Servidor (termina em /api/assets)", 28, 240, 424, 20, new Font("Segoe UI", 9F), Muted);
        serverLabel.Visible = serverBox.Visible;
        body.Controls.Add(serverLabel);
        body.Controls.Add(serverBox);
        Uri parsed;
        string host = Uri.TryCreate(server, UriKind.Absolute, out parsed) ? parsed.Host : server;
        var link = new LinkLabel { Text = "Servidor: " + host + " · alterar", Bounds = new Rectangle(28, 312, 424, 20), Visible = !serverBox.Visible, LinkColor = Navy, Font = new Font("Segoe UI", 9F) };
        link.LinkArea = new LinkArea(link.Text.Length - 7, 7);
        link.LinkClicked += delegate { link.Visible = false; serverLabel.Visible = true; serverBox.Visible = true; serverBox.Focus(); };
        body.Controls.Add(link);
        Buttons("Continuar", async delegate
        {
            inviteText = input.Text;
            try
            {
                string candidate = serverBox.Text;
                code = AgentSetup.ParseInvite(input.Text, ref candidate);
                Uri uri;
                server = AgentSetup.NormalizeServer(candidate, out uri);
                insecure = uri.Scheme == "http";
                if (insecure && MessageBox.Show(this, "Este servidor usa HTTP sem criptografia. Continue somente dentro da rede local da empresa.", "Ambiente de teste", MessageBoxButtons.OKCancel, MessageBoxIcon.Warning) != DialogResult.OK) return;
            }
            catch (InvalidOperationException invalid) { ShowCodePage(invalid.Message); return; }
            ShowProgress("Validando o convite…", "Conectando ao servidor. Na primeira conexão do dia isso pode levar até 1 minuto.");
            try
            {
                string url = server, key = code;
                locations = await Task.Run(() => AgentSetup.FetchLocations(url, key));
                busy = false;
                ShowUnitPage();
            }
            catch (Exception failure) { busy = false; ShowCodePage(failure is InvalidOperationException ? failure.Message : "Resposta inesperada do servidor. Confira o endereço e tente novamente."); }
        }, "Cancelar", delegate { DialogResult = DialogResult.Cancel; });
        ActiveControl = input;
    }

    private void ShowUnitPage()
    {
        Reset("Etapa 2 de 2", "Confirme a unidade", "Computador: " + Environment.MachineName);
        body.Controls.Add(MakeLabel("UNIDADE", 28, 108, 424, 18, new Font("Segoe UI Semibold", 8.5F), Muted));
        var combo = new ComboBox { Bounds = new Rectangle(28, 128, 424, 30), DropDownStyle = ComboBoxStyle.DropDownList, Font = new Font("Segoe UI", 11F) };
        foreach (var location in locations) combo.Items.Add(location);
        var detected = AgentSetup.Detect(locations);
        combo.SelectedItem = detected;
        body.Controls.Add(combo);
        body.Controls.Add(MakeLabel(detected != null ? "Unidade identificada pela rede. Confira antes de continuar." : "Selecione a unidade onde este computador fica.", 28, 164, 424, 20, new Font("Segoe UI", 9F), detected != null ? Color.FromArgb(0x15, 0x80, 0x3D) : Muted));
        var privacy = new Panel { Bounds = new Rectangle(28, 194, 424, 84), BackColor = Color.FromArgb(0xF1, 0xF5, 0xF9) };
        privacy.Controls.Add(MakeLabel("O SmartHelpDesk envia dados técnicos (hardware, sistema, usuário conectado, IP e uso de recursos) ao ligar o computador e às 15h. Não coleta arquivos, senhas, teclas digitadas nem localização.", 12, 10, 400, 66, new Font("Segoe UI", 9F), Color.FromArgb(0x33, 0x41, 0x55)));
        body.Controls.Add(privacy);
        var consent = new CheckBox { Text = "Estou ciente do monitoramento técnico corporativo.", Bounds = new Rectangle(28, 290, 424, 24) };
        body.Controls.Add(consent);
        Buttons("Cadastrar computador", async delegate
        {
            chosen = combo.SelectedItem as AgentLocation;
            if (chosen == null) { MessageBox.Show(this, "Selecione a unidade do computador.", "SmartHelpDesk"); return; }
            ShowProgress("Cadastrando este computador…", "Instalando o agente e enviando o primeiro diagnóstico. Não desligue o computador.");
            string url = server, key = code;
            var location = chosen;
            bool http = insecure;
            string error;
            try { error = await Task.Run(() => AgentSetup.RunInstall(url, key, location, http)); }
            catch (Exception failure) { error = failure.Message; }
            busy = false;
            if (error == null) ShowDone(); else ShowError(error);
        }, "Voltar", delegate { ShowCodePage(null); });
        primary.Enabled = false;
        consent.CheckedChanged += delegate { primary.Enabled = consent.Checked && combo.SelectedItem != null; };
        combo.SelectedIndexChanged += delegate { primary.Enabled = consent.Checked && combo.SelectedItem != null; };
    }

    private void ShowProgress(string title, string description)
    {
        busy = true;
        Reset(null, title, description);
        body.Controls.Add(new ProgressBar { Bounds = new Rectangle(28, 150, 424, 8), Style = ProgressBarStyle.Marquee, MarqueeAnimationSpeed = 25 });
        Buttons(null, null, null, null);
    }

    private Panel Badge(Color color, bool check)
    {
        var badge = new Panel { Bounds = new Rectangle(28, 30, 56, 56) };
        badge.Paint += delegate(object sender, PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            float s = badge.Width / 56F;
            using (var brush = new SolidBrush(color)) g.FillEllipse(brush, 1, 1, badge.Width - 3, badge.Height - 3);
            using (var pen = new Pen(Color.White, 4.5F * s) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round })
            {
                if (check) g.DrawLines(pen, new[] { new PointF(17 * s, 29 * s), new PointF(25 * s, 37 * s), new PointF(40 * s, 21 * s) });
                else { g.DrawLine(pen, 28 * s, 16 * s, 28 * s, 31 * s); g.DrawLine(pen, 28 * s, 39 * s, 28 * s, 39.5F * s); }
            }
        };
        return badge;
    }

    private void ShowDone()
    {
        body.Controls.Clear();
        body.Controls.Add(Badge(Color.FromArgb(0x16, 0xA3, 0x4A), true));
        body.Controls.Add(MakeLabel("Computador cadastrado!", 26, 100, 428, 30, new Font("Segoe UI Semibold", 13.5F), Color.FromArgb(0x0F, 0x17, 0x2A)));
        body.Controls.Add(MakeLabel("Unidade: " + chosen.Name, 28, 134, 424, 22, new Font("Segoe UI", 9.75F), Muted));
        body.Controls.Add(MakeLabel("O ícone do SmartHelpDesk fica perto do relógio. Se não aparecer, clique na seta ^ da barra de tarefas. O diagnóstico é enviado ao ligar o computador e às 15h.", 28, 168, 424, 64, new Font("Segoe UI", 9.75F), Muted));
        Buttons("Concluir", delegate { DialogResult = DialogResult.OK; }, null, null);
    }

    private void ShowError(string message)
    {
        body.Controls.Clear();
        body.Controls.Add(Badge(Danger, false));
        body.Controls.Add(MakeLabel("Não foi possível concluir", 26, 100, 428, 30, new Font("Segoe UI Semibold", 13.5F), Color.FromArgb(0x0F, 0x17, 0x2A)));
        body.Controls.Add(MakeLabel(message, 28, 134, 424, 66, new Font("Segoe UI", 9.75F), Danger));
        body.Controls.Add(MakeLabel("Se o convite já foi usado, gere outro no painel. Detalhes: C:\\ProgramData\\SmartHelpDeskAgent\\agent.log", 28, 206, 424, 44, new Font("Segoe UI", 9F), Muted));
        Buttons("Tentar novamente", delegate { inviteText = ""; ShowCodePage(null); }, "Fechar", delegate { DialogResult = DialogResult.Abort; });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && logo != null) logo.Dispose();
        base.Dispose(disposing);
    }
}
