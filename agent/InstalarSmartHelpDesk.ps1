$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic

$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$principal=New-Object Security.Principal.WindowsPrincipal($identity)
if (!$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  try {
    $arguments="-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $arguments | Out-Null
  } catch {
    [System.Windows.Forms.MessageBox]::Show("A instalacao precisa da permissao de administrador do Windows.","Smart HelpDesk",0,16)|Out-Null
  }
  exit
}

$server=[Microsoft.VisualBasic.Interaction]::InputBox("Informe a URL do Smart HelpDesk fornecida pela TI.","Servidor Smart HelpDesk","http://192.168.10.54:8090/api/assets")
if(!$server){exit}
$server=$server.Trim().TrimEnd('/')
try{$uri=[Uri]$server}catch{[System.Windows.Forms.MessageBox]::Show("URL invalida.","Smart HelpDesk",0,16)|Out-Null;exit 1}
$allowHttp=$false
if($uri.Scheme -ne "https"){
  $privateHttp=$uri.Scheme -eq "http" -and ($uri.Host -eq "localhost" -or $uri.Host -eq "127.0.0.1" -or $uri.Host -match '^10\.' -or $uri.Host -match '^192\.168\.' -or $uri.Host -match '^172\.(1[6-9]|2[0-9]|3[01])\.')
  if(!$privateHttp){[System.Windows.Forms.MessageBox]::Show("HTTP so e permitido em endereco privado de laboratorio. Use HTTPS fora da rede local.","Smart HelpDesk",0,16)|Out-Null;exit 1}
  $confirmHttp=[Windows.Forms.MessageBox]::Show("Este ambiente de teste usa HTTP sem criptografia. Continue somente dentro da rede corporativa local. Deseja continuar?","Ambiente de teste",4,48)
  if($confirmHttp -ne "Yes"){exit};$allowHttp=$true
}
$enrollmentKey=[Microsoft.VisualBasic.Interaction]::InputBox("Informe o convite temporário de instalação fornecido pela TI.","Convite de instalação","")
if(!$enrollmentKey){exit}
$core=Join-Path $PSScriptRoot "SmartHelpDeskAgent.ps1"
try { $locations=Invoke-RestMethod -Uri "$server/agent/locations" -Headers @{"X-Agent-Enrollment"=$enrollmentKey} -Method Get } catch { [System.Windows.Forms.MessageBox]::Show("Nao foi possivel validar o convite ou acessar o Smart HelpDesk.","Smart HelpDesk",0,16)|Out-Null; exit 1 }
$ips=@(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*'} | Select-Object -ExpandProperty IPAddress)
$detected=$locations | Where-Object { $prefix=$_.rede_prefixo; $prefix -and ($ips | Where-Object {$_ -like "$prefix*"}) } | Select-Object -First 1
$form=New-Object Windows.Forms.Form
$form.Text="Cadastro do Smart HelpDesk Agent";$form.Size=New-Object Drawing.Size(480,345);$form.StartPosition="CenterScreen";$form.FormBorderStyle="FixedDialog";$form.MaximizeBox=$false
$title=New-Object Windows.Forms.Label;$title.Text="Cadastrar este computador";$title.Font=New-Object Drawing.Font("Segoe UI",16,[Drawing.FontStyle]::Bold);$title.SetBounds(28,24,410,34);$form.Controls.Add($title)
$help=New-Object Windows.Forms.Label;$help.Text=if($detected){"Unidade identificada pela rede. Confirme antes de enviar."}else{"A rede nao foi reconhecida. Selecione a unidade correta."};$help.SetBounds(30,66,410,36);$form.Controls.Add($help)
$label=New-Object Windows.Forms.Label;$label.Text="Unidade";$label.SetBounds(30,112,100,22);$form.Controls.Add($label)
$combo=New-Object Windows.Forms.ComboBox;$combo.DropDownStyle="DropDownList";$combo.SetBounds(30,136,400,32);[void]$combo.Items.AddRange(@($locations|ForEach-Object{"$($_.municipio) - $($_.nome)"}));if($detected){for($i=0;$i-lt @($locations).Count;$i++){if(@($locations)[$i].id-eq$detected.id){$combo.SelectedIndex=$i;break}}}elseif($combo.Items.Count){$combo.SelectedIndex=0};$form.Controls.Add($combo)
$privacy=New-Object Windows.Forms.Label;$privacy.Text="Coleta diaria as 15h: hardware, sistema, usuario, IP e uso de recursos. Nao coleta arquivos, senhas, teclas ou GPS.";$privacy.ForeColor=[Drawing.Color]::DimGray;$privacy.SetBounds(30,177,400,40);$form.Controls.Add($privacy)
$legal=New-Object Windows.Forms.CheckBox;$legal.Text="Estou ciente do aviso de privacidade e do monitoramento tecnico corporativo.";$legal.SetBounds(30,220,400,38);$form.Controls.Add($legal)
$cancel=New-Object Windows.Forms.Button;$cancel.Text="Cancelar";$cancel.DialogResult="Cancel";$cancel.SetBounds(242,270,90,30);$form.Controls.Add($cancel)
$ok=New-Object Windows.Forms.Button;$ok.Text="Confirmar";$ok.SetBounds(340,270,90,30);$ok.BackColor=[Drawing.Color]::FromArgb(37,99,235);$ok.ForeColor=[Drawing.Color]::White;$form.Controls.Add($ok)
$ok.Add_Click({if($combo.SelectedIndex -lt 0){[Windows.Forms.MessageBox]::Show("Selecione uma unidade.")|Out-Null;return};if(!$legal.Checked){[Windows.Forms.MessageBox]::Show("Confirme a ciencia sobre o aviso de privacidade.")|Out-Null;return};$form.DialogResult="OK";$form.Close()})
if($form.ShowDialog() -ne "OK"){exit}
$location=@($locations)[$combo.SelectedIndex]
$answer=[Windows.Forms.MessageBox]::Show("Confirma o cadastro em $($location.nome), $($location.municipio)?","Confirmar localizacao",4,32)
if($answer -ne "Yes"){exit}
$agentArgs=@{ServerUrl=$server;EnrollmentKey=$enrollmentKey;Municipio=$location.municipio;Unidade=$location.nome;Latitude=[double]$location.latitude;Longitude=[double]$location.longitude;Install=$true}
if($allowHttp){$agentArgs.AllowInsecureHttp=$true}
try { & $core @agentArgs; [Windows.Forms.MessageBox]::Show("Cadastro confirmado e primeiro diagnostico enviado. A coleta ocorrera na inicializacao e todos os dias as 15h.","Smart HelpDesk",0,64)|Out-Null } catch {[Windows.Forms.MessageBox]::Show("A instalacao nao foi concluida. Nenhuma confirmacao falsa foi gravada.`n`nDetalhe: $($_.Exception.Message)`n`nLog: C:\ProgramData\SmartHelpDeskAgent\agent.log","Smart HelpDesk",0,16)|Out-Null}
