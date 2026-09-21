# Responsabilidade: Automação de smart help desk agent; executa uma tarefa operacional ou de geração do projeto.
param([string]$ServerUrl="",[string]$EnrollmentKey="",[string]$Municipio="",[string]$Unidade="",[double]$Latitude=0,[double]$Longitude=0,[switch]$Install,[switch]$AllowInsecureHttp)
$ErrorActionPreference="Stop";$AgentVersion="2.1.0";$SchemaVersion=1
$DataDir=Join-Path $env:ProgramData "SmartHelpDeskAgent";$ConfigFile=Join-Path $DataDir "agent.json";$LogFile=Join-Path $DataDir "agent.log";$StatusFile=Join-Path $DataDir "status.json"
if(!(Test-Path $DataDir)){New-Item -ItemType Directory -Path $DataDir -Force|Out-Null}
function Write-Log($Stage,$Status,$Message){$safe=($Message-replace '(?i)(token|authorization|bearer)\s*[=:]\s*\S+','$1=[PROTEGIDO]');"$(Get-Date -Format o) stage=$Stage status=$Status message=$safe"|Add-Content -LiteralPath $LogFile -Encoding UTF8}
function Write-Status([string]$State){
 try{
  $previous=if(Test-Path $StatusFile){Get-Content $StatusFile -Raw|ConvertFrom-Json}else{$null}
  $now=(Get-Date).ToUniversalTime().ToString("o")
  $last=if($previous){$previous.lastSuccessAt}else{$null};if($last -is [datetime]){$last=$last.ToUniversalTime().ToString("o")}
  if($State -eq "ok"){$last=$now}
  $temp="$StatusFile.tmp"
  [ordered]@{state=$State;updatedAt=$now;lastSuccessAt=$last;agentVersion=$AgentVersion}|ConvertTo-Json|Set-Content -LiteralPath $temp -Encoding UTF8
  Move-Item -LiteralPath $temp -Destination $StatusFile -Force
 }catch{Write-Log "status" "PARTIAL" $_.Exception.Message}
}
trap{Write-Log "run" "ERROR" $_.Exception.Message;Write-Status "error";break}
function Safe($Name,[scriptblock]$Action,$Fallback=$null){try{$v=&$Action;Write-Log $Name "OK" "coleta concluida";return $v}catch{Write-Log $Name "PARTIAL" $_.Exception.Message;return $Fallback}}
function Post($Uri,$Body,$Headers=@{}){$delays=@(2,5,10);for($i=0;$i-lt 3;$i++){try{return Invoke-RestMethod -Uri $Uri -Method Post -TimeoutSec 60 -Headers $Headers -ContentType "application/json; charset=utf-8" -Body ($Body|ConvertTo-Json -Depth 12 -Compress)}catch{$last=$_;Write-Log "http" "RETRY" "tentativa=$($i+1) erro=$($_.Exception.Message)";if($i-lt 2){Start-Sleep $delays[$i]}}};throw $last}
function State($Value){if($null-eq $Value){"UNKNOWN"}elseif([bool]$Value){"ENABLED"}else{"DISABLED"}}
function Normalize-ServerUrl([string]$Value) {
 $uri=$null
 if(![Uri]::TryCreate($Value.Trim(),[UriKind]::Absolute,[ref]$uri)-or $uri.Scheme -notin @('http','https') -or $uri.UserInfo -or $uri.Query -or $uri.Fragment){throw "Informe uma URL HTTP/HTTPS sem credenciais, parametros ou fragmentos."}
 $url=$uri.AbsoluteUri.TrimEnd('/')
 if($uri.AbsolutePath.TrimEnd('/') -notmatch '/api/assets$'){throw "A URL do agente deve terminar em /api/assets (ex.: https://servidor/suporte/api/assets). Copie o comando em Ativos > Gerar convite do agente."}
 return $url
}
function Get-CpuUsage {
 $sample=Safe "cpu-usage" {Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" | Select-Object -First 1} $null
 if($null -eq $sample -or $null -eq $sample.PercentProcessorTime){return $null}
 return [math]::Round([math]::Max([double]0,[math]::Min([double]100,[double]$sample.PercentProcessorTime)),2)
}
function Get-Inventory{
 $cs=Safe "computer" {Get-CimInstance Win32_ComputerSystem} @{};$os=Safe "os" {Get-CimInstance Win32_OperatingSystem} @{};$bios=Safe "bios" {Get-CimInstance Win32_BIOS} @{};$board=Safe "board" {Get-CimInstance Win32_BaseBoard|Select-Object -First 1} @{}
 $cpus=@(Safe "cpu" {Get-CimInstance Win32_Processor} @());$mem=@(Safe "memory" {Get-CimInstance Win32_PhysicalMemory} @());$disks=@(Safe "disks" {Get-CimInstance Win32_DiskDrive} @());$vols=@(Safe "volumes" {Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"} @())
 $video=@(Safe "video" {Get-CimInstance Win32_VideoController} @());$nets=@(Safe "network" {Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True"} @());$battery=Safe "battery" {Get-CimInstance Win32_Battery|Select-Object -First 1} $null
 $monitors=@(Safe "monitors" {Get-CimInstance Win32_DesktopMonitor} @());$printers=@(Safe "printers" {Get-CimInstance Win32_Printer|Select-Object -First 30} @());$updates=@(Safe "updates" {Get-CimInstance Win32_QuickFixEngineering|Select-Object -First 50} @())
 $defender=Safe "defender" {Get-MpComputerStatus} $null;$firewall=@(Safe "firewall" {Get-NetFirewallProfile} @());$bitlocker=@(Safe "bitlocker" {Get-BitLockerVolume} @());$tpm=Safe "tpm" {Get-Tpm} $null
 $serial=if($bios.SerialNumber){$bios.SerialNumber.Trim()}else{$null};$invalid=@($null,"","To be filled by O.E.M.","Default string","System Serial Number","Unknown");$guid=Safe "machine-guid" {(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name MachineGuid).MachineGuid} "";$deviceId=if($invalid-notcontains $serial){$serial}elseif($guid){"WIN-$guid"}else{$env:COMPUTERNAME}
 $route=Safe "route" {Get-NetRoute -DestinationPrefix "0.0.0.0/0"|Sort-Object RouteMetric|Select-Object -First 1} $null;$primary=if($route){$nets|Where-Object InterfaceIndex -eq $route.InterfaceIndex|Select-Object -First 1}else{$nets|Select-Object -First 1}
 $ramTotal=[long](($mem|Measure-Object Capacity -Sum).Sum);if(!$ramTotal){$ramTotal=[long]$cs.TotalPhysicalMemory};$storageTotal=[long](($vols|Measure-Object Size -Sum).Sum);$storageFree=[long](($vols|Measure-Object FreeSpace -Sum).Sum);$main=$vols|Where-Object DeviceID -eq $env:SystemDrive|Select-Object -First 1;$lastBoot=$os.LastBootUpTime
 $r=[ordered]@{schemaVersion=$SchemaVersion;reportId=[guid]::NewGuid().ToString();collectedAt=(Get-Date).ToUniversalTime().ToString("o");agentVersion=$AgentVersion;deviceId=$deviceId;hostname=$env:COMPUTERNAME;serialNumber=$serial;patrimonio=$serial;municipio=$Municipio;unidade=$Unidade;latitude=$Latitude;longitude=$Longitude
  computer=[ordered]@{hostname=$env:COMPUTERNAME;manufacturer=$cs.Manufacturer;model=$cs.Model;serialNumber=$serial;domain=$cs.Domain;loggedUser=$cs.UserName}
  bios=[ordered]@{manufacturer=$bios.Manufacturer;version=$bios.SMBIOSBIOSVersion;releaseDate=if($bios.ReleaseDate){$bios.ReleaseDate.ToUniversalTime().ToString("o")}else{$null}}
  motherboard=[ordered]@{manufacturer=$board.Manufacturer;product=$board.Product;serialNumber=$board.SerialNumber}
  processors=@($cpus|ForEach-Object{[ordered]@{name=$_.Name;manufacturer=$_.Manufacturer;cores=$_.NumberOfCores;logicalProcessors=$_.NumberOfLogicalProcessors;maxClockMhz=$_.MaxClockSpeed;processorId=$_.ProcessorId}})
  memory=[ordered]@{totalBytes=$ramTotal;modules=@($mem|ForEach-Object{[ordered]@{bank=$_.BankLabel;deviceLocator=$_.DeviceLocator;capacityBytes=[long]$_.Capacity;speedMhz=$_.Speed;manufacturer=$_.Manufacturer;partNumber=if($_.PartNumber){$_.PartNumber.Trim()}else{$null};serialNumber=if($_.SerialNumber){$_.SerialNumber.Trim()}else{$null}}})}
  storage=[ordered]@{totalBytes=$storageTotal;freeBytes=$storageFree;physicalDisks=@($disks|ForEach-Object{[ordered]@{index=$_.Index;model=$_.Model;interfaceType=$_.InterfaceType;mediaType=$_.MediaType;serialNumber=if($_.SerialNumber){$_.SerialNumber.Trim()}else{$null};sizeBytes=[long]$_.Size}});volumes=@($vols|ForEach-Object{[ordered]@{drive=$_.DeviceID;label=$_.VolumeName;fileSystem=$_.FileSystem;sizeBytes=[long]$_.Size;freeBytes=[long]$_.FreeSpace;freePercentage=if($_.Size){[math]::Round(100*$_.FreeSpace/$_.Size,2)}else{$null}}})}
  videoAdapters=@($video|ForEach-Object{[ordered]@{name=$_.Name;driverVersion=$_.DriverVersion;adapterRamBytes=[long]$_.AdapterRAM}})
  network=[ordered]@{primaryIpv4=if($primary){@($primary.IPAddress|Where-Object{$_-match '^\d+\.'})[0]}else{$null};primaryMac=if($primary){$primary.MACAddress}else{$null};adapters=@($nets|ForEach-Object{[ordered]@{description=$_.Description;mac=$_.MACAddress;dhcpEnabled=$_.DHCPEnabled;ipAddresses=@($_.IPAddress);gateways=@($_.DefaultIPGateway);dnsServers=@($_.DNSServerSearchOrder)}})}
  operatingSystem=[ordered]@{caption=$os.Caption;version=$os.Version;build=$os.BuildNumber;architecture=$os.OSArchitecture;installDate=if($os.InstallDate){$os.InstallDate.ToUniversalTime().ToString("o")}else{$null};lastBoot=if($lastBoot){$lastBoot.ToUniversalTime().ToString("o")}else{$null};locale=$os.Locale;timeZone=(Get-TimeZone).Id}
  security=[ordered]@{tpm=[ordered]@{status=if($tpm){State $tpm.TpmReady}else{"UNKNOWN"};present=if($tpm){$tpm.TpmPresent}else{$null}};defender=[ordered]@{status=if($defender){State $defender.AntivirusEnabled}else{"UNKNOWN"};signaturesUpdated=if($defender){!$defender.AntivirusSignatureOutOfDate}else{$null}};firewall=[ordered]@{status=if($firewall.Count){State (@($firewall|Where-Object Enabled).Count-eq $firewall.Count)}else{"UNKNOWN"};profiles=@($firewall|ForEach-Object{[ordered]@{name=$_.Name;enabled=$_.Enabled}})};bitlocker=[ordered]@{status=if($bitlocker.Count){State (@($bitlocker|Where-Object ProtectionStatus -eq 'On').Count-gt 0)}else{"UNKNOWN"};volumes=@($bitlocker|ForEach-Object{[ordered]@{mountPoint=$_.MountPoint;protectionStatus=[string]$_.ProtectionStatus;volumeStatus=[string]$_.VolumeStatus}})}}
  battery=if($battery){[ordered]@{status=$battery.Status;estimatedChargeRemaining=$battery.EstimatedChargeRemaining}}else{$null}
  monitors=@($monitors|ForEach-Object{[ordered]@{name=$_.Name;manufacturer=$_.MonitorManufacturer;type=$_.MonitorType;status=$_.Status}})
  printers=@($printers|ForEach-Object{[ordered]@{name=$_.Name;driverName=$_.DriverName;portName=$_.PortName;network=$_.Network;default=$_.Default}})
  updates=@($updates|ForEach-Object{[ordered]@{hotFixId=$_.HotFixID;description=$_.Description;installedOn=if($_.InstalledOn){([datetime]$_.InstalledOn).ToString("yyyy-MM-dd")}else{$null}}})
  metrics=[ordered]@{cpuUsagePercent=Get-CpuUsage;ramUsagePercent=if($os.TotalVisibleMemorySize){[math]::Round(100*(1-$os.FreePhysicalMemory/$os.TotalVisibleMemorySize),2)}else{$null};systemDiskUsagePercent=if($main.Size){[math]::Round(100*(1-$main.FreeSpace/$main.Size),2)}else{$null};uptimeHours=if($lastBoot){[math]::Round(((Get-Date)-$lastBoot).TotalHours,2)}else{$null}}}
 $r.ip=$r.network.primaryIpv4;$r.mac=$r.network.primaryMac;$r.usuario=$cs.UserName;$r.sistemaOperacional="$($os.Caption) $($os.Version)";$r.processador=if($cpus.Count){$cpus[0].Name}else{$null};$r.ramTotal=[math]::Round($ramTotal/1GB,2);$r.armazenamento=($vols|ForEach-Object{"$($_.DeviceID) $([math]::Round($_.Size/1GB)) GB"})-join " | ";$r.cpuUsage=$r.metrics.cpuUsagePercent;$r.ramUsage=$r.metrics.ramUsagePercent;$r.diskUsage=$r.metrics.systemDiskUsagePercent;$r.antivirusAtualizado=$r.security.defender.signaturesUpdated;$r.firewallEnabled=if($r.security.firewall.status-eq "UNKNOWN"){$null}else{$r.security.firewall.status-eq "ENABLED"};$r.uptimeHours=$r.metrics.uptimeHours;$r.lastBoot=$r.operatingSystem.lastBoot;return $r
}
$config=if(Test-Path $ConfigFile){Get-Content $ConfigFile -Raw|ConvertFrom-Json}else{$null}
if(!$ServerUrl -and $config -and !$Install){$ServerUrl=$config.serverUrl}
$ServerUrl=Normalize-ServerUrl $ServerUrl
if(!$Install -and $config.token -and $ServerUrl -ne (Normalize-ServerUrl $config.serverUrl)){throw "Servidor diferente do cadastro salvo. Use -Install com um novo convite para mudar o servidor."}
if(([Uri]$ServerUrl).Scheme-ne "https"-and !$AllowInsecureHttp){throw "O agente exige HTTPS. Use -AllowInsecureHttp somente em laboratorio."}
if($config -and !$Install){if(!$Municipio){$Municipio=$config.municipio};if(!$Unidade){$Unidade=$config.unidade};if(!$Latitude){$Latitude=$config.latitude};if(!$Longitude){$Longitude=$config.longitude}}
if($Install-and(!$EnrollmentKey-or!$Municipio-or!$Unidade-or!$Latitude-or!$Longitude)){throw "Convite e unidade completa sao obrigatorios."}
Write-Status "collecting"
$inventory=Get-Inventory
if($Install-or!$config.token){if(!$EnrollmentKey){throw "Agente ainda nao registrado."};$enroll=@{}+$inventory;$enroll.enrollmentKey=$EnrollmentKey; $response=Post "$ServerUrl/agent/enroll" $enroll;if(!$response.token -or !$response.deviceId){throw "O servidor nao retornou um cadastro valido. Verifique a URL da API."};[ordered]@{deviceId=$response.deviceId;token=$response.token;serverUrl=$ServerUrl;municipio=$Municipio;unidade=$Unidade;latitude=$Latitude;longitude=$Longitude;allowInsecureHttp=[bool]$AllowInsecureHttp}|ConvertTo-Json|Set-Content -LiteralPath $ConfigFile -Encoding UTF8;&icacls.exe $ConfigFile /inheritance:r /grant:r "*S-1-5-18:F" "*S-1-5-32-544:F"|Out-Null;if($LASTEXITCODE -ne 0){throw "Nao foi possivel proteger a credencial do agente."};$config=Get-Content $ConfigFile -Raw|ConvertFrom-Json}
$result=Post "$ServerUrl/agent/report" $inventory @{Authorization="Bearer $($config.token)"}
if($result.ok -ne $true){throw "O servidor nao confirmou o inventario. Verifique a URL da API."}
Write-Log "report" "OK" "servidor=$ServerUrl report=$($inventory.reportId) snapshot=$($result.snapshotId)"
Write-Status "ok"
if($Install){. (Join-Path $PSScriptRoot "Install-Tray.ps1");Install-AgentTray $PSScriptRoot $DataDir;Remove-Item -LiteralPath (Join-Path $DataDir "SmartHelpDeskAgent.ps1") -Force -ErrorAction SilentlyContinue;Write-Host "Cadastro confirmado, inventario enviado e tarefa criada."}
