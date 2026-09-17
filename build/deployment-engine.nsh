; Shared deployment-engine bridge v2.0.0
; NSIS remains deliberately silent when invoked by deployment-ui.
; This include only redirects Windows' visible uninstall entry to our bespoke shell.
!define DEPLOYMENT_UI_UNINSTALLER "Project Island Uninstaller.exe"

!macro customInstall
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString '"$INSTDIR\${DEPLOYMENT_UI_UNINSTALLER}" --mode=uninstall --install-dir="$INSTDIR"'
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" QuietUninstallString '"$INSTDIR\${DEPLOYMENT_UI_UNINSTALLER}" --mode=uninstall --install-dir="$INSTDIR" /S'
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" DisplayIcon '"$INSTDIR\${DEPLOYMENT_UI_UNINSTALLER}"'
!macroend
