# Responsabilidade: Compila o SmartHelpDesk (bandeja + assistente de cadastro) e gera o instalador de arquivo unico.
# O executavel leva embutidos os scripts do agente, o logo, a chave publica e o servidor padrao.
param([switch]$NoPackage,[string]$ServerUrl='https://smart-helpdesk-backend-dp5r.onrender.com/api/assets')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if(!(Test-Path $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'}
if(!(Test-Path $compiler)){throw 'Instale o .NET Framework 4.x para compilar o aplicativo.'}
$version=[regex]::Match((Get-Content (Join-Path $PSScriptRoot 'SmartHelpDeskAgent.ps1') -Raw),'\$AgentVersion="(\d+\.\d+\.\d+)"').Groups[1].Value
if(!$version){throw 'Nao encontrei $AgentVersion em SmartHelpDeskAgent.ps1.'}
if($ServerUrl -notmatch '^https?://[^?#]+/api/assets/?$'){throw 'ServerUrl deve terminar em /api/assets.'}

$build=Join-Path $root 'output\build'
New-Item -ItemType Directory -Path $build -Force|Out-Null
Set-Content -LiteralPath (Join-Path $build 'server-url.txt') -Value $ServerUrl.TrimEnd('/') -Encoding ASCII -NoNewline
# Nome e versao exibidos nas Propriedades do arquivo e no pedido de administrador do Windows.
@"
using System.Reflection;
[assembly: AssemblyTitle("SmartHelpDesk")]
[assembly: AssemblyDescription("SmartHelpDesk - inventario tecnico e suporte")]
[assembly: AssemblyProduct("SmartHelpDesk")]
[assembly: AssemblyVersion("$version.0")]
[assembly: AssemblyFileVersion("$version.0")]
"@|Set-Content -LiteralPath (Join-Path $build 'AssemblyInfo.cs') -Encoding UTF8
# DPI: janela nitida em telas com escala 125%/150%.
@'
<?xml version="1.0" encoding="utf-8"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
  <assemblyIdentity version="1.0.0.0" name="SmartHelpDesk"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v2"><security><requestedPrivileges xmlns="urn:schemas-microsoft-com:asm.v3"><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security></trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1"><application><supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/></application></compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3"><windowsSettings><dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true</dpiAware></windowsSettings></application>
</assembly>
'@|Set-Content -LiteralPath (Join-Path $build 'app.manifest') -Encoding UTF8

$resources=@('SmartHelpDeskAgent.ps1','Install-Tray.ps1','SmartHelpDesk-logo.png')|ForEach-Object{"/resource:$(Join-Path $PSScriptRoot $_),$_"}
$resources+="/resource:$(Join-Path $build 'server-url.txt'),server-url.txt"
# Sem a chave publica o agente funciona, mas nao recebe atualizacoes automaticas.
$publicKey=Join-Path $PSScriptRoot 'update-public-key.xml'
if(Test-Path $publicKey){$resources+="/resource:$publicKey,update-public-key.xml"}else{Write-Warning 'update-public-key.xml ausente: este instalador nao tera atualizacao automatica. Rode Nova-ChaveAtualizacao.ps1.'}

$icon=Join-Path $PSScriptRoot 'SmartHelpDesk.ico'
$exe=Join-Path $PSScriptRoot 'SmartHelpDeskTray.exe'
$sources=@((Join-Path $PSScriptRoot 'SmartHelpDeskTray.cs'),(Join-Path $PSScriptRoot 'SetupWizard.cs'),(Join-Path $build 'AssemblyInfo.cs'))
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ "/win32icon:$icon" "/win32manifest:$(Join-Path $build 'app.manifest')" "/out:$exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:Microsoft.CSharp.dll @resources @sources
if($LASTEXITCODE -ne 0){throw 'Falha ao compilar SmartHelpDeskTray.exe'}
if(!$NoPackage){
 # Um unico arquivo: basta enviar ao colaborador e pedir para abrir.
 $installer=Join-Path $root "output\Instalar-SmartHelpDesk-$version.exe"
 Copy-Item -LiteralPath $exe -Destination $installer -Force
 Write-Host "Instalador criado: $installer"
}
