# Chamado somente pelo instalador elevado. O aplicativo de bandeja não lê agent.json.
function Set-AgentDirectoryAcl([string]$Path) {
 $acl=New-Object Security.AccessControl.DirectorySecurity
 $acl.SetAccessRuleProtection($true,$false)
 foreach($entry in @(@('S-1-5-18','FullControl'),@('S-1-5-32-544','FullControl'),@('S-1-5-32-545','ReadAndExecute'))) {
  $sid=New-Object Security.Principal.SecurityIdentifier($entry[0])
  $rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,$entry[1],'ContainerInherit,ObjectInherit','None','Allow')
  $acl.AddAccessRule($rule)
 }
 Set-Acl -LiteralPath $Path -AclObject $acl
}

function Install-AgentTray([string]$SourceDir,[string]$DataDir) {
 $installDir=Join-Path $env:ProgramFiles 'SmartHelpDeskAgent'
 if(!(Test-Path $installDir)){New-Item -ItemType Directory -Path $installDir|Out-Null}
 Set-AgentDirectoryAcl $installDir
 Set-AgentDirectoryAcl $DataDir
 # Encerra somente o ícone desta instalação para permitir sua atualização.
 Get-Process -Name SmartHelpDeskTray -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -eq (Join-Path $installDir 'SmartHelpDeskTray.exe')
 } | Stop-Process -Force
 foreach($file in @('SmartHelpDeskTray.exe','SmartHelpDeskAgent.ps1','Install-Tray.ps1')) {
  $source=Join-Path $SourceDir $file
  $target=Join-Path $installDir $file
  if([IO.Path]::GetFullPath($source) -ne [IO.Path]::GetFullPath($target)){Copy-Item -LiteralPath $source -Destination $target -Force}
 }
 $action=New-ScheduledTaskAction -Execute (Join-Path $installDir 'SmartHelpDeskTray.exe') -Argument '--collect'
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
 $principal=New-ScheduledTaskPrincipal -UserId SYSTEM -LogonType ServiceAccount -RunLevel Highest
 Register-ScheduledTask -TaskName 'SmartHelpDesk Agent' -Action $action -Trigger @((New-ScheduledTaskTrigger -Daily -At '15:00'),(New-ScheduledTaskTrigger -AtStartup)) -Settings $settings -Principal $principal -Description 'Inventario tecnico autorizado do SmartHelpDesk' -Force|Out-Null
 $scheduler=New-Object -ComObject 'Schedule.Service'
 $scheduler.Connect()
 $task=$scheduler.GetFolder('\').GetTask('SmartHelpDesk Agent')
 # Usuários podem consultar/executar; somente administradores/SYSTEM podem alterar.
 $task.SetSecurityDescriptor('D:P(A;;FA;;;SY)(A;;FA;;;BA)(A;;FRFX;;;BU)',0)
 $shell=New-Object -ComObject WScript.Shell
 foreach($folder in @([Environment]::GetFolderPath('CommonStartup'),[Environment]::GetFolderPath('CommonPrograms'))) {
  $link=$shell.CreateShortcut((Join-Path $folder 'SmartHelpDesk Agent.lnk'))
  $link.TargetPath=Join-Path $installDir 'SmartHelpDeskTray.exe'
  $link.Arguments='--tray';$link.WorkingDirectory=$installDir;$link.IconLocation=$link.TargetPath+',0'
  $link.Description='Status do inventario e acesso ao SmartHelpDesk';$link.Save()
 }
}
