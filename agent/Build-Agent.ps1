param([switch]$NoPackage)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if(!(Test-Path $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'}
if(!(Test-Path $compiler)){throw 'Instale o .NET Framework 4.x para compilar o aplicativo.'}
$icon=Join-Path $PSScriptRoot 'SmartHelpDesk.ico'
$exe=Join-Path $PSScriptRoot 'SmartHelpDeskTray.exe'
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ "/win32icon:$icon" "/out:$exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:Microsoft.CSharp.dll (Join-Path $PSScriptRoot 'SmartHelpDeskTray.cs')
if($LASTEXITCODE -ne 0){throw 'Falha ao compilar SmartHelpDeskTray.exe'}
if(!$NoPackage){
 $output=Join-Path $root 'output'
 New-Item -ItemType Directory -Path $output -Force|Out-Null
 $files=@('SmartHelpDeskTray.exe','SmartHelpDeskAgent.ps1','Install-Tray.ps1','InstalarSmartHelpDesk.ps1','Instalar Smart HelpDesk.vbs','README.md')|ForEach-Object{Join-Path $PSScriptRoot $_}
 $archive=Join-Path $output 'SmartHelpDesk-Agent-2.1.0.zip'
 Compress-Archive -LiteralPath $files -DestinationPath $archive -Force
 Write-Host "Pacote criado: $archive"
}
