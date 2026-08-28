param([string]$At = "02:00", [int]$RetentionDays = 14, [switch]$System)
$ErrorActionPreference = "Stop"
$backupScript = (Resolve-Path (Join-Path $PSScriptRoot "backup.ps1")).Path
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$backupScript`" -RetentionDays $RetentionDays"
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10)
$principal = if ($System) {
  New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
} else {
  New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
}
Register-ScheduledTask -TaskName "SmartHelpDesk Backup Diario" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Backup diario validado do PostgreSQL e anexos do Smart HelpDesk" -Force | Out-Null
Write-Host "Backup diário configurado para $At com retenção de $RetentionDays dias."
