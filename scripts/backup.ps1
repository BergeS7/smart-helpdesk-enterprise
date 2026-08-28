param(
  [string]$Destination = (Join-Path $PSScriptRoot "..\backups"),
  [int]$RetentionDays = 14
)
$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$destinationPath = [IO.Path]::GetFullPath($Destination)
if ($destinationPath -eq [IO.Path]::GetPathRoot($destinationPath)) { throw "Destino de backup amplo demais." }
New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$databaseFile = Join-Path $destinationPath "smart-helpdesk-$stamp.dump"
$uploadsFile = Join-Path $destinationPath "smart-helpdesk-uploads-$stamp.tar.gz"
$containerDump = "/tmp/smart-helpdesk-$stamp.dump"

docker exec smart-helpdesk-database pg_dump -U smart_helpdesk -d smart_helpdesk -Fc -f $containerDump
if ($LASTEXITCODE -eq 0) { docker cp "smart-helpdesk-database:${containerDump}" $databaseFile }
docker exec smart-helpdesk-database rm -f $containerDump | Out-Null
if ($LASTEXITCODE -ne 0 -or !(Test-Path $databaseFile) -or (Get-Item $databaseFile).Length -lt 1024) { throw "Falha ao criar backup consistente do PostgreSQL." }
docker run --rm --volumes-from smart-helpdesk-backend -v "${destinationPath}:/backup" alpine:3.21 tar -czf "/backup/$(Split-Path $uploadsFile -Leaf)" -C /app uploads
if ($LASTEXITCODE -ne 0) { throw "Falha ao criar backup dos anexos." }

$manifest = [ordered]@{createdAt=(Get-Date).ToUniversalTime().ToString("o");database=(Split-Path $databaseFile -Leaf);uploads=(Split-Path $uploadsFile -Leaf);databaseSha256=(Get-FileHash $databaseFile -Algorithm SHA256).Hash;uploadsSha256=(Get-FileHash $uploadsFile -Algorithm SHA256).Hash}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destinationPath "smart-helpdesk-$stamp.json") -Encoding UTF8
Get-ChildItem -LiteralPath $destinationPath -File | Where-Object LastWriteTime -lt (Get-Date).AddDays(-[Math]::Max(1,$RetentionDays)) | Remove-Item -Force
Write-Host "Backup validado em $destinationPath"
