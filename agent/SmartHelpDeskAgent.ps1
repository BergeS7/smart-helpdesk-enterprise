param(
  [Parameter(Mandatory=$true)][string]$ServerUrl,
  [string]$EnrollmentKey = "",
  [string]$Municipio = "",
  [string]$Unidade = "",
  [double]$Latitude = 0,
  [double]$Longitude = 0,
  [switch]$Install,
  [switch]$AllowInsecureHttp
)
$ErrorActionPreference = "Stop"
if (([Uri]$ServerUrl).Scheme -ne "https" -and !$AllowInsecureHttp) { throw "O agente exige HTTPS. Use -AllowInsecureHttp somente em laboratório local controlado." }
$agentVersion = "1.1.0"
$dataDir = Join-Path $env:ProgramData "SmartHelpDeskAgent"
$configFile = Join-Path $dataDir "agent.json"
$logFile = Join-Path $dataDir "agent.log"
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }

function Get-Inventory {
  $computer = Get-CimInstance Win32_ComputerSystem
  $bios = Get-CimInstance Win32_BIOS
  $os = Get-CimInstance Win32_OperatingSystem
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  $processorPerf = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
  $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
  $mainDisk = $disks | Where-Object DeviceID -eq $env:SystemDrive | Select-Object -First 1
  $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1
  $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -First 1
  $adapter = Get-NetAdapter -InterfaceIndex $route.InterfaceIndex
  $connection = try { Get-NetConnectionProfile -InterfaceIndex $route.InterfaceIndex } catch { $null }
  $ramUsage = if ($os.TotalVisibleMemorySize) { [math]::Round((1-($os.FreePhysicalMemory/$os.TotalVisibleMemorySize))*100,2) } else { 0 }
  $diskUsage = if ($mainDisk.Size) { [math]::Round((1-($mainDisk.FreeSpace/$mainDisk.Size))*100,2) } else { 0 }
  $avUpdated = $null
  try { $mp = Get-MpComputerStatus; $avUpdated = [bool]($mp.AntivirusEnabled -and !$mp.AntivirusSignatureOutOfDate) } catch {}
  $firewallEnabled = $null
  try { $firewallEnabled = [bool](@(Get-NetFirewallProfile | Where-Object Enabled).Count -gt 0) } catch {}
  $lastBoot = $os.LastBootUpTime
  $uptimeHours = if ($lastBoot) { [math]::Round(((Get-Date)-$lastBoot).TotalHours,2) } else { 0 }
  $serial = if ($bios.SerialNumber) { $bios.SerialNumber.Trim() } else { "" }
  $invalidSerials = @("", "To be filled by O.E.M.", "Default string", "System Serial Number", "None", "Unknown")
  $validSerial = $invalidSerials -notcontains $serial
  $machineGuid = try { (Get-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name MachineGuid).MachineGuid } catch { "" }
  $stableDeviceId = if ($validSerial) { $serial } elseif ($machineGuid) { "WIN-$machineGuid" } else { $env:COMPUTERNAME }
  return @{
    deviceId = $stableDeviceId
    patrimonio = if ($validSerial) { $serial } else { $null }; hostname = $env:COMPUTERNAME; serialNumber = if ($validSerial) { $serial } else { $null }
    municipio = $Municipio; unidade = $Unidade; latitude = $Latitude; longitude = $Longitude
    ip = $ip.IPAddress; mac = $adapter.MacAddress; usuario = if ($computer.UserName) { $computer.UserName } else { [System.Security.Principal.WindowsIdentity]::GetCurrent().Name }
    sistemaOperacional = "$($os.Caption) $($os.Version)"; processador = $cpu.Name
    ramTotal = [math]::Round($computer.TotalPhysicalMemory/1GB,2)
    armazenamento = (($disks | ForEach-Object { "$($_.DeviceID) $([math]::Round($_.Size/1GB)) GB" }) -join " | ")
    cpuUsage = [math]::Round($processorPerf.PercentProcessorTime,2); ramUsage = $ramUsage; diskUsage = $diskUsage
    antivirusAtualizado = $avUpdated; agentVersion = $agentVersion
    uptimeHours = $uptimeHours; lastBoot = if ($lastBoot) { $lastBoot.ToUniversalTime().ToString("o") } else { $null }
    firewallEnabled = $firewallEnabled; networkType = if ($connection) { $connection.InterfaceAlias } else { $adapter.Name }; linkSpeed = $adapter.LinkSpeed
  }
}

if ($Install -and (!$EnrollmentKey -or !$Municipio -or !$Unidade -or !$Latitude -or !$Longitude)) { throw "Convite e unidade completa são obrigatórios para instalar." }

$inventory = Get-Inventory
$config = if (Test-Path $configFile) { Get-Content $configFile -Raw | ConvertFrom-Json } else { $null }
if ($Install -or !$config.token) {
  if (!$EnrollmentKey) { throw "Agente ainda não registrado. Informe -EnrollmentKey." }
  $enroll = $inventory.Clone(); $enroll.enrollmentKey = $EnrollmentKey
  try { $response = Invoke-RestMethod -Uri "$ServerUrl/agent/enroll" -Method Post -TimeoutSec 30 -ContentType "application/json; charset=utf-8" -Body ($enroll | ConvertTo-Json -Depth 4) }
  catch { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ERRO cadastro: $($_.Exception.Message)" | Add-Content -Path $logFile -Encoding UTF8; throw }
  @{ deviceId=$response.deviceId; token=$response.token; serverUrl=$ServerUrl } | ConvertTo-Json | Set-Content -Path $configFile -Encoding UTF8
  & icacls.exe $configFile /inheritance:r /grant:r "SYSTEM:F" "Administrators:F" | Out-Null
  $config = Get-Content $configFile -Raw | ConvertFrom-Json
}
$headers = @{ Authorization = "Bearer $($config.token)" }
try { $result = Invoke-RestMethod -Uri "$ServerUrl/agent/heartbeat" -Method Post -TimeoutSec 30 -Headers $headers -ContentType "application/json; charset=utf-8" -Body ($inventory | ConvertTo-Json -Depth 4) }
catch { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ERRO diagnóstico: $($_.Exception.Message)" | Add-Content -Path $logFile -Encoding UTF8; throw }
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') OK ativo=$($result.id) servidor=$ServerUrl" | Add-Content -Path $logFile -Encoding UTF8
if ($Install) {
  $target = Join-Path $dataDir "SmartHelpDeskAgent.ps1"
  Copy-Item -LiteralPath $PSCommandPath -Destination $target -Force
  $httpArgument = if ($AllowInsecureHttp) { " -AllowInsecureHttp" } else { "" }
  $arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$target`" -ServerUrl `"$ServerUrl`" -Municipio `"$Municipio`" -Unidade `"$Unidade`" -Latitude $Latitude -Longitude $Longitude$httpArgument"
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
  $dailyTrigger = New-ScheduledTaskTrigger -Daily -At "15:00"
  $startupTrigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  Register-ScheduledTask -TaskName "SmartHelpDesk Agent" -Action $action -Trigger @($dailyTrigger,$startupTrigger) -Settings $settings -Principal $principal -Description "Diagnóstico técnico diário autorizado do Smart HelpDesk" -Force | Out-Null
  Write-Host "Smart HelpDesk: cadastro confirmado, primeiro diagnóstico enviado e tarefa diária criada."
}
