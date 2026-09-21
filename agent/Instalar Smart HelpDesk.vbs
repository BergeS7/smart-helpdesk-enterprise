Set shell = CreateObject("WScript.Shell")
base = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
exe = base & "\SmartHelpDeskTray.exe"
If CreateObject("Scripting.FileSystemObject").FileExists(exe) Then
  shell.Run """" & exe & """ --install", 0, False
Else
  shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & base & "\InstalarSmartHelpDesk.ps1""", 0, False
End If
