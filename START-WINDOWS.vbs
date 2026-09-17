Option Explicit

Dim shell, fso, root, electronCli
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
electronCli = fso.BuildPath(root, "node_modules\electron\cli.js")
shell.CurrentDirectory = root

If Not fso.FileExists(electronCli) Then
  MsgBox "Project Island cannot start because the Electron package is missing." & vbCrLf & vbCrLf & _
    "Run START-WINDOWS.bat from the project folder so dependency setup can be checked.", _
    vbExclamation, "Project Island"
  WScript.Quit 2
End If

' Run the package CLI rather than electron.exe directly. Electron 43+ can
' download/prepare its pinned runtime on first CLI use after a clean install.
shell.Run "node.exe " & Chr(34) & electronCli & Chr(34) & " .", 0, False
