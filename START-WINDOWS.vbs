Option Explicit

Dim shell, fso, root, electronExe, batFile
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = fso.BuildPath(root, "node_modules\electron\dist\electron.exe")
batFile = fso.BuildPath(root, "START-WINDOWS.bat")
shell.CurrentDirectory = root

If fso.FileExists(electronExe) Then
  shell.Run Chr(34) & electronExe & Chr(34) & " .", 0, False
Else
  shell.Run "cmd.exe /c " & Chr(34) & batFile & Chr(34), 1, False
End If
