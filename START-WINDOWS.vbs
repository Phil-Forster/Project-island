Option Explicit

Dim shell, fso, root, electronExe
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = fso.BuildPath(root, "node_modules\electron\dist\electron.exe")
shell.CurrentDirectory = root

If Not fso.FileExists(electronExe) Then
  MsgBox "Project Island cannot start because the Electron runtime is not prepared." & vbCrLf & vbCrLf & _
    "Run START-WINDOWS.bat from the project folder to prepare it.", _
    vbExclamation, "Project Island"
  WScript.Quit 2
End If

shell.Run Chr(34) & electronExe & Chr(34) & " .", 0, False
