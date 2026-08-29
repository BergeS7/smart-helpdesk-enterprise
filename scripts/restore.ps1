# Responsabilidade: Automação de restore; executa uma tarefa operacional ou de geração do projeto.
param(
  [Parameter(Mandatory=$true)][string]$DatabaseBackup,
  [string]$UploadsBackup = ""
)
$ErrorActionPreference = "Stop"
$databasePath = (Resolve-Path -LiteralPath $DatabaseBackup).Path
if ([IO.Path]::GetExtension($databasePath) -ne ".dump") { throw "Informe um arquivo .dump válido." }
Write-Warning "A restauração substitui os dados atuais do Smart HelpDesk. Confirme digitando RESTAURAR."
if ((Read-Host) -ne "RESTAURAR") { throw "Restauração cancelada." }
$containerDump = "/tmp/smart-helpdesk-restore.dump"
docker cp $databasePath "smart-helpdesk-database:${containerDump}"
if ($LASTEXITCODE -eq 0) { docker exec smart-helpdesk-database pg_restore -U smart_helpdesk -d smart_helpdesk --clean --if-exists --no-owner $containerDump }
docker exec smart-helpdesk-database rm -f $containerDump | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Falha ao restaurar o PostgreSQL." }
if ($UploadsBackup) {
  $uploadsPath = (Resolve-Path -LiteralPath $UploadsBackup).Path
  $uploadsDirectory = Split-Path $uploadsPath
  docker run --rm --volumes-from smart-helpdesk-backend -v "${uploadsDirectory}:/backup:ro" alpine:3.21 tar -xzf "/backup/$(Split-Path $uploadsPath -Leaf)" -C /app
  if ($LASTEXITCODE -ne 0) { throw "Banco restaurado, mas houve falha nos anexos." }
}
Write-Host "Restauração concluída. Reinicie os serviços e execute a verificação de saúde."
