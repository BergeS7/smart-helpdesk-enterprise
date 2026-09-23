# Responsabilidade: Compila, empacota e assina uma nova versao do agente para a atualizacao automatica.
# Antes: aumente $AgentVersion em SmartHelpDeskAgent.ps1. Depois: envie o .json gerado
# em Ativos > Atualizacoes do agente.
param([string]$ChavePrivada=(Join-Path $env:USERPROFILE 'SmartHelpDesk-Chave-Atualizacao\chave-privada.xml'))
$ErrorActionPreference='Stop'
$publicKeyFile=Join-Path $PSScriptRoot 'update-public-key.xml'
if(!(Test-Path -LiteralPath $ChavePrivada)){throw "Chave privada nao encontrada em $ChavePrivada. Informe o caminho com -ChavePrivada."}
if(!(Test-Path -LiteralPath $publicKeyFile)){throw "update-public-key.xml nao encontrado. Rode Nova-ChaveAtualizacao.ps1 primeiro."}
$script=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'SmartHelpDeskAgent.ps1') -Raw
$match=[regex]::Match($script,'\$AgentVersion="(\d+\.\d+\.\d+)"')
if(!$match.Success){throw 'Nao encontrei $AgentVersion em SmartHelpDeskAgent.ps1.'}
$version=$match.Groups[1].Value

$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider
$verifier=New-Object Security.Cryptography.RSACryptoServiceProvider
try{
 $rsa.FromXmlString((Get-Content -LiteralPath $ChavePrivada -Raw))
 $verifier.FromXmlString((Get-Content -LiteralPath $publicKeyFile -Raw))
 # Assinar com a chave errada faria todos os agentes recusarem o pacote.
 if($rsa.ExportParameters($false).Modulus.Length -ne $verifier.ExportParameters($false).Modulus.Length -or
    [Convert]::ToBase64String($rsa.ExportParameters($false).Modulus) -ne [Convert]::ToBase64String($verifier.ExportParameters($false).Modulus)){
  throw "A chave privada nao corresponde a update-public-key.xml."
 }
 & (Join-Path $PSScriptRoot 'Build-Agent.ps1') -NoPackage
 $output=Join-Path (Split-Path $PSScriptRoot -Parent) 'output'
 New-Item -ItemType Directory -Path $output -Force|Out-Null
 $zip=Join-Path $output "SmartHelpDesk-Agent-$version-update.zip"
 $files=@('SmartHelpDeskTray.exe','SmartHelpDeskAgent.ps1','Install-Tray.ps1','update-public-key.xml')|ForEach-Object{Join-Path $PSScriptRoot $_}
 Compress-Archive -LiteralPath $files -DestinationPath $zip -Force
 $bytes=[IO.File]::ReadAllBytes($zip)
 if($bytes.Length -gt 6MB){throw "Pacote maior que 6 MB."}
 $sha=[Security.Cryptography.SHA256]::Create()
 $sha256=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant();$sha.Dispose()
 # Mesmo texto que o agente confere em Test-UpdateSignature.
 $message=[Text.Encoding]::UTF8.GetBytes("SmartHelpDeskAgent-update|$version|$sha256")
 $hash=[Security.Cryptography.HashAlgorithmName]::SHA256;$padding=[Security.Cryptography.RSASignaturePadding]::Pkcs1
 $signature=$rsa.SignData($message,$hash,$padding)
 if(!$verifier.VerifyData($message,$signature,$hash,$padding)){throw "A assinatura gerada nao foi validada."}
}finally{$rsa.Dispose();$verifier.Dispose()}

$release=Join-Path $output "SmartHelpDesk-Agent-$version.update.json"
[ordered]@{format='smarthelpdesk-agent-update';version=$version;sha256=$sha256;signature=[Convert]::ToBase64String($signature);package=[Convert]::ToBase64String($bytes)}|ConvertTo-Json -Compress|Set-Content -LiteralPath $release -Encoding ASCII
Remove-Item -LiteralPath $zip -Force
Write-Host ""
Write-Host "Versao $version assinada: $release" -ForegroundColor Green
Write-Host "Envie este arquivo em Ativos > Atualizacoes do agente. Os computadores instalam na proxima coleta (inicializacao ou 15h)."
