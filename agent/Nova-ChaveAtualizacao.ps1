# Responsabilidade: Gera o par de chaves que assina as atualizacoes automaticas do agente.
# Rode UMA vez, no computador da TI. A chave privada fica fora do projeto e nunca
# vai para o servidor; a chave publica (update-public-key.xml) vai junto do agente.
param([string]$ChavePrivada=(Join-Path $env:USERPROFILE 'SmartHelpDesk-Chave-Atualizacao\chave-privada.xml'),[switch]$Substituir)
$ErrorActionPreference='Stop'
$publicKey=Join-Path $PSScriptRoot 'update-public-key.xml'
if(((Test-Path -LiteralPath $publicKey) -or (Test-Path -LiteralPath $ChavePrivada)) -and !$Substituir){
 throw "Ja existe uma chave. Trocar a chave impede os agentes instalados de aceitarem novas versoes ate serem reinstalados manualmente. Se tiver certeza, rode novamente com -Substituir."
}
$repo=[IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent)).TrimEnd('\')+'\'
if([IO.Path]::GetFullPath($ChavePrivada).StartsWith($repo,[StringComparison]::OrdinalIgnoreCase)){throw "Guarde a chave privada fora da pasta do projeto para ela nunca ir para o Git."}
$folder=Split-Path $ChavePrivada -Parent
New-Item -ItemType Directory -Path $folder -Force|Out-Null
$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider(3072)
try{
 Set-Content -LiteralPath $ChavePrivada -Value $rsa.ToXmlString($true) -Encoding ASCII
 # Somente o usuario atual le a chave privada.
 & icacls.exe $ChavePrivada /inheritance:r /grant:r "$([Security.Principal.WindowsIdentity]::GetCurrent().Name):F"|Out-Null
 if($LASTEXITCODE -ne 0){throw "Nao foi possivel proteger a chave privada."}
 Set-Content -LiteralPath $publicKey -Value $rsa.ToXmlString($false) -Encoding ASCII
}finally{$rsa.Dispose()}
Write-Host ""
Write-Host "Chave privada: $ChavePrivada" -ForegroundColor Yellow
Write-Host "  -> FACA UM BACKUP (pendrive guardado ou cofre de senhas). Nao envie por e-mail nem coloque no servidor."
Write-Host "  -> Sem ela voce nao consegue publicar atualizacoes; se vazar, gere outra e reinstale os agentes."
Write-Host "Chave publica: $publicKey"
Write-Host "  -> Pode ir para o Git. Gere o pacote (Build-Agent.ps1) e reinstale os agentes uma vez para ativar a atualizacao automatica."
