; Bespoke Shared Installer Framework (BSI) v1.0.5
; Shared by Project Island, Project Gone, Project Drive and Project Float.
; NSIS/Electron Builder remain the deployment engine; no stock wizard page is
; intentionally exposed as user-facing UI. The visible flow is state-driven:
; Ready -> Installing -> Complete/Error in one persistent installer window.

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "WinMessages.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "UAC.nsh"

!define BSI_FRAMEWORK_VERSION "1.0.5"
!define BSI_UNINSTALL_FILENAME "Uninstall ${PRODUCT_FILENAME}.exe"

; Keep any hidden MUI surface dark so a redraw/focus transition cannot flash a
; system-coloured panel before the bespoke shell is attached.
!ifdef MUI_BGCOLOR
  !undef MUI_BGCOLOR
!endif
!define MUI_BGCOLOR "${BSI_BG}"
!ifdef MUI_TEXTCOLOR
  !undef MUI_TEXTCOLOR
!endif
!define MUI_TEXTCOLOR "${BSI_TEXT}"
!ifdef MUI_INSTFILESPAGE_COLORS
  !undef MUI_INSTFILESPAGE_COLORS
!endif
!define MUI_INSTFILESPAGE_COLORS "${BSI_TEXT} ${BSI_BG}"
!ifdef MUI_INSTALLCOLORS
  !undef MUI_INSTALLCOLORS
!endif
!define MUI_INSTALLCOLORS "${BSI_ACCENT} ${BSI_PROGRESS_BG}"
!define MUI_INSTFILESPAGE_PROGRESSBAR "colored"
!define MUI_ABORTWARNING
!define MUI_UNABORTWARNING

; Electron Builder inserts a Components page whenever customUnInstallSection is
; defined. The shared framework uses a hidden finalisation section solely to get
; a synchronous callback after the engine has completed removal. Pre-skip that
; engine-owned Components page so it is never user-visible.
!ifdef BUILD_UNINSTALLER
  !define MUI_PAGE_CUSTOMFUNCTION_PRE un.BSI_SkipHiddenComponents
!endif

Var BSI.IsInner
Var BSI.Dialog
Var BSI.Shell
Var BSI.ShellHandle
Var BSI.NativeShell
Var BSI.NativeShellImage
Var BSI.FontBrand
Var BSI.FontTitle
Var BSI.FontBody
Var BSI.FontSmall
Var BSI.FontMicro

!ifndef BUILD_UNINSTALLER
Var BSI.Scope
Var BSI.PathEdit
Var BSI.PathDirty
Var BSI.PathValue
Var BSI.PathError
Var BSI.ScopeCurrent
Var BSI.ScopeAll
Var BSI.LaunchButton
Var BSI.LaunchLabel
Var BSI.LaunchNow
Var BSI.LaunchOnExit
Var BSI.InstallTitle
Var BSI.InstallStatus
Var BSI.InstallNote
Var BSI.InstallProgress
Var BSI.UpgradeSettleCount
!else
Var BSI.UninstallTitle
Var BSI.UninstallStatus
Var BSI.UninstallNote
Var BSI.UninstallProgress
!endif

!macro BSI_EXTRACT_UI MODE
  InitPluginsDir
  File /oname=$PLUGINSDIR\bsi-shell.bmp "${BUILD_RESOURCES_DIR}\installer\shell-${MODE}.bmp"
  File /oname=$PLUGINSDIR\bsi-toggle-on.bmp "${BUILD_RESOURCES_DIR}\installer\toggle-on.bmp"
  File /oname=$PLUGINSDIR\bsi-toggle-off.bmp "${BUILD_RESOURCES_DIR}\installer\toggle-off.bmp"
  File /oname=$PLUGINSDIR\bsi-btn-back.bmp "${BUILD_RESOURCES_DIR}\btn-back.bmp"
  File /oname=$PLUGINSDIR\bsi-btn-next.bmp "${BUILD_RESOURCES_DIR}\btn-next.bmp"
  File /oname=$PLUGINSDIR\bsi-btn-cancel.bmp "${BUILD_RESOURCES_DIR}\btn-cancel.bmp"
  !ifndef BUILD_UNINSTALLER
    File /oname=$PLUGINSDIR\bsi-btn-install.bmp "${BUILD_RESOURCES_DIR}\btn-install.bmp"
    File /oname=$PLUGINSDIR\bsi-btn-finish.bmp "${BUILD_RESOURCES_DIR}\btn-finish.bmp"
    File /oname=$PLUGINSDIR\bsi-btn-close.bmp "${BUILD_RESOURCES_DIR}\btn-close.bmp"
  !else
    File /oname=$PLUGINSDIR\bsi-btn-remove.bmp "${BUILD_RESOURCES_DIR}\btn-remove.bmp"
    File /oname=$PLUGINSDIR\bsi-btn-close.bmp "${BUILD_RESOURCES_DIR}\btn-close.bmp"
  !endif
!macroend

!macro BSI_CREATE_FONTS PREFIX
  CreateFont $BSI.FontBrand "Segoe UI" 9 700
  CreateFont $BSI.FontTitle "Segoe UI" 17 700
  CreateFont $BSI.FontBody "Segoe UI" 10 400
  CreateFont $BSI.FontSmall "Segoe UI" 9 600
  CreateFont $BSI.FontMicro "Segoe UI" 8 400
!macroend

!macro BSI_DARK_CHROME
  ; Remove the stock caption/system buttons so the installer never presents a
  ; native Windows wizard title bar. The persistent shell and bespoke
  ; Cancel/Install/Finish/Remove/Close actions own the visible window journey.
  System::Call 'user32::GetWindowLongW(p $HWNDPARENT, i -16)i .r1'
  IntOp $R1 $R1 & 0xFF34FFFF
  System::Call 'user32::SetWindowLongW(p $HWNDPARENT, i -16, i r1)i .r2'
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i 0, i 0, i 0, i 0, i 0x0027)i .r2'
  ; Keep the OS-owned outer border dark and coherent where DWM supplies one.
  StrCpy $R5 ${BSI_BORDER_COLORREF}
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 34, *i r5, i 4)i .r2'
  SetCtlColors $HWNDPARENT ${BSI_TEXT} ${BSI_BG}
!macroend

!macro BSI_HIDE_WIZARD_CHROME
  LockWindow on
  ShowWindow $mui.Branding.Background ${SW_HIDE}
  ShowWindow $mui.Branding.Text ${SW_HIDE}
  ShowWindow $mui.Header.Text ${SW_HIDE}
  ShowWindow $mui.Header.SubText ${SW_HIDE}
  ShowWindow $mui.Header.Image ${SW_HIDE}
  ShowWindow $mui.Line.Standard ${SW_HIDE}
  ShowWindow $mui.Line.FullWindow ${SW_SHOW}
  GetDlgItem $R5 $HWNDPARENT 1028
  ${If} $R5 != 0
    ShowWindow $R5 ${SW_HIDE}
  ${EndIf}
  GetDlgItem $R5 $HWNDPARENT 1256
  ${If} $R5 != 0
    ShowWindow $R5 ${SW_HIDE}
  ${EndIf}
  GetDlgItem $R5 $HWNDPARENT 1035
  ${If} $R5 != 0
    SetCtlColors $R5 ${BSI_BORDER} ${BSI_BORDER}
  ${EndIf}
  GetDlgItem $R5 $HWNDPARENT 1045
  ${If} $R5 != 0
    SetCtlColors $R5 ${BSI_BORDER} ${BSI_BORDER}
  ${EndIf}
  LockWindow off
!macroend

; Load a bitmap scaled to the current button client size. This keeps the bespoke
; controls aligned at Windows DPI scaling levels instead of assuming 96 DPI.
!macro BSI_SKIN_BUTTON HANDLE FILE
  ${If} ${HANDLE} != 0
    ${NSD_AddStyle} ${HANDLE} ${BS_BITMAP}|${BS_FLAT}
    System::Call 'uxtheme::SetWindowTheme(p ${HANDLE}, w "", w "")i .r0'
    System::Call '*(&i4 .r1, &i4 .r2, &i4 .r3, &i4 .r4) p.r5'
    System::Call 'user32::GetClientRect(p ${HANDLE}, p r5)i .r0'
    System::Call '*$5(i .r1, i .r2, i .r3, i .r4)'
    System::Free $5
    System::Call 'user32::LoadImageW(p 0, w "$PLUGINSDIR\\${FILE}", i ${IMAGE_BITMAP}, i r3, i r4, i ${LR_LOADFROMFILE})p.r5'
    SendMessage ${HANDLE} ${BM_SETIMAGE} ${IMAGE_BITMAP} $R5
  ${EndIf}
!macroend

!macro BSI_NAV PRIMARY_FILE PRIMARY_SHOW CANCEL_SHOW
  !insertmacro BSI_DARK_CHROME
  !insertmacro BSI_HIDE_WIZARD_CHROME
  GetDlgItem $R0 $HWNDPARENT 1
  GetDlgItem $R1 $HWNDPARENT 3
  GetDlgItem $R2 $HWNDPARENT 2
  ShowWindow $R1 ${SW_HIDE}
  ShowWindow $R0 ${PRIMARY_SHOW}
  ShowWindow $R2 ${CANCEL_SHOW}
  !insertmacro BSI_SKIN_BUTTON $R0 "${PRIMARY_FILE}"
  !insertmacro BSI_SKIN_BUTTON $R2 "bsi-btn-cancel.bmp"
!macroend

!macro BSI_PAGE_SHELL
  SetCtlColors $BSI.Dialog ${BSI_TEXT} ${BSI_BG}
  ${NSD_CreateBitmap} 0 0 100% 100% ""
  Pop $BSI.Shell
  ${NSD_SetStretchedImage} $BSI.Shell "$PLUGINSDIR\bsi-shell.bmp" $BSI.ShellHandle
  !insertmacro BSI_HIDE_WIZARD_CHROME
!macroend

!macro BSI_PAGE_LABEL X Y W H TEXT FONT COLOR OUT
  ${NSD_CreateLabel} ${X} ${Y} ${W} ${H} "${TEXT}"
  Pop ${OUT}
  SendMessage ${OUT} ${WM_SETFONT} ${FONT} 1
  SetCtlColors ${OUT} ${COLOR} transparent
!macroend

; Percentage helpers for controls created directly on the hidden InstFiles child.
; $R4 = client width, $R5 = client height in pixels.
!macro BSI_RECT X Y W H OX OY OW OH
  IntOp ${OX} $R4 * ${X}
  IntOp ${OX} ${OX} / 100
  IntOp ${OY} $R5 * ${Y}
  IntOp ${OY} ${OY} / 100
  IntOp ${OW} $R4 * ${W}
  IntOp ${OW} ${OW} / 100
  IntOp ${OH} $R5 * ${H}
  IntOp ${OH} ${OH} / 100
!macroend

!macro BSI_NATIVE_STATIC OUT PARENT X Y W H TEXT FONT COLOR
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w "${TEXT}", i ${WS_CHILD}|${WS_VISIBLE}|${SS_LEFT}, i ${X}, i ${Y}, i ${W}, i ${H}, p ${PARENT}, p 0, p 0, p 0)p.r9'
  StrCpy ${OUT} $R9
  SendMessage ${OUT} ${WM_SETFONT} ${FONT} 1
  SetCtlColors ${OUT} ${COLOR} transparent
!macroend

!macro BSI_ATTACH_NATIVE_SHELL PAGEHANDLE
  ; Read the actual child size so the artwork scales with the page at high DPI.
  System::Call '*(&i4 .r0, &i4 .r1, &i4 .r4, &i4 .r5) p.r3'
  System::Call 'user32::GetClientRect(p ${PAGEHANDLE}, p r3)i .r2'
  System::Call '*$3(i .r0, i .r1, i .r4, i .r5)'
  System::Free $3
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w "", i ${WS_CHILD}|${WS_VISIBLE}|${SS_BITMAP}, i 0, i 0, i r4, i r5, p ${PAGEHANDLE}, p 0, p 0, p 0)p.r6'
  StrCpy $BSI.NativeShell $R6
  System::Call 'user32::LoadImageW(p 0, w "$PLUGINSDIR\\bsi-shell.bmp", i ${IMAGE_BITMAP}, i r4, i r5, i ${LR_LOADFROMFILE})p.r7'
  StrCpy $BSI.NativeShellImage $R7
  SendMessage $BSI.NativeShell ${STM_SETIMAGE} ${IMAGE_BITMAP} $BSI.NativeShellImage
!macroend

!ifndef BUILD_UNINSTALLER

Function BSI_PathChanged
  Pop $R0
  StrCpy $BSI.PathDirty "1"
  ${NSD_GetText} $BSI.PathEdit $BSI.PathValue
  ${NSD_SetText} $BSI.PathError ""
FunctionEnd

Function BSI_SetCurrentScope
  Pop $R0
  StrCpy $BSI.Scope "current"
  !insertmacro BSI_SKIN_BUTTON $BSI.ScopeCurrent "bsi-toggle-on.bmp"
  !insertmacro BSI_SKIN_BUTTON $BSI.ScopeAll "bsi-toggle-off.bmp"
  ${If} $BSI.PathDirty != "1"
    StrCpy $BSI.PathValue "$LOCALAPPDATA\Programs\${APP_FILENAME}"
    ${NSD_SetText} $BSI.PathEdit "$BSI.PathValue"
  ${EndIf}
FunctionEnd

Function BSI_SetAllScope
  Pop $R0
  StrCpy $BSI.Scope "all"
  !insertmacro BSI_SKIN_BUTTON $BSI.ScopeCurrent "bsi-toggle-off.bmp"
  !insertmacro BSI_SKIN_BUTTON $BSI.ScopeAll "bsi-toggle-on.bmp"
  ${If} $BSI.PathDirty != "1"
    ${If} ${RunningX64}
      StrCpy $BSI.PathValue "$PROGRAMFILES64\${APP_FILENAME}"
    ${Else}
      StrCpy $BSI.PathValue "$PROGRAMFILES\${APP_FILENAME}"
    ${EndIf}
    ${NSD_SetText} $BSI.PathEdit "$BSI.PathValue"
  ${EndIf}
FunctionEnd

Function BSI_ReadyCreate
  ; Electron Builder may relaunch an elevated inner instance for all-users.
  ; The outer bespoke Ready state has already collected the user's choices, so
  ; never expose a duplicate visible page in the inner process.
  ${If} $BSI.IsInner == "1"
    Abort
  ${EndIf}
  nsDialogs::Create 1044
  Pop $BSI.Dialog
  ${If} $BSI.Dialog == error
    Abort
  ${EndIf}
  !insertmacro BSI_PAGE_SHELL

  !insertmacro BSI_PAGE_LABEL 17% 7% 42% 7% "${BSI_PROJECT_NAME}" $BSI.FontBrand ${BSI_ACCENT} $R0
  !insertmacro BSI_PAGE_LABEL 17% 14% 42% 7% "${BSI_GAME_NAME} · ACHIEVEMENT TRACKER" $BSI.FontMicro ${BSI_MUTED} $R0
  !insertmacro BSI_PAGE_LABEL 5% 29% 52% 10% "READY TO INSTALL" $BSI.FontTitle ${BSI_TEXT} $R0
  !insertmacro BSI_PAGE_LABEL 5% 40% 52% 14% "${BSI_READY_COPY}" $BSI.FontBody ${BSI_MUTED} $R0
  !insertmacro BSI_PAGE_LABEL 5% 55% 30% 6% "INSTALL LOCATION" $BSI.FontSmall ${BSI_ACCENT} $R0

  ${NSD_CreateText} 5% 62% 52% 9% "$INSTDIR"
  Pop $BSI.PathEdit
  SendMessage $BSI.PathEdit ${WM_SETFONT} $BSI.FontBody 1
  SetCtlColors $BSI.PathEdit ${BSI_TEXT} ${BSI_SURFACE}
  ${NSD_OnChange} $BSI.PathEdit BSI_PathChanged
  StrCpy $BSI.PathValue "$INSTDIR"
  StrCpy $BSI.PathDirty "0"

  !insertmacro BSI_PAGE_LABEL 5% 73% 18% 6% "INSTALL FOR" $BSI.FontSmall ${BSI_MUTED} $R0
  ${NSD_CreateButton} 5% 80% 5% 8% ""
  Pop $BSI.ScopeCurrent
  ${NSD_OnClick} $BSI.ScopeCurrent BSI_SetCurrentScope
  ${NSD_CreateButton} 31% 80% 5% 8% ""
  Pop $BSI.ScopeAll
  ${NSD_OnClick} $BSI.ScopeAll BSI_SetAllScope
  !insertmacro BSI_PAGE_LABEL 11% 80% 18% 8% "Current user" $BSI.FontBody ${BSI_TEXT} $R0
  !insertmacro BSI_PAGE_LABEL 37% 80% 20% 8% "All users (UAC)" $BSI.FontBody ${BSI_TEXT} $R0
  ${If} $BSI.Scope == "all"
    !insertmacro BSI_SKIN_BUTTON $BSI.ScopeCurrent "bsi-toggle-off.bmp"
    !insertmacro BSI_SKIN_BUTTON $BSI.ScopeAll "bsi-toggle-on.bmp"
  ${Else}
    !insertmacro BSI_SKIN_BUTTON $BSI.ScopeCurrent "bsi-toggle-on.bmp"
    !insertmacro BSI_SKIN_BUTTON $BSI.ScopeAll "bsi-toggle-off.bmp"
  ${EndIf}

  !insertmacro BSI_PAGE_LABEL 5% 91% 52% 5% "${BSI_SAFE_COPY}" $BSI.FontMicro ${BSI_MUTED} $R0
  !insertmacro BSI_PAGE_LABEL 5% 96% 52% 4% "" $BSI.FontMicro ${BSI_ACCENT} $BSI.PathError

  !insertmacro BSI_NAV "bsi-btn-install.bmp" ${SW_SHOW} ${SW_SHOW}
  nsDialogs::Show
  ${NSD_FreeImage} $BSI.ShellHandle
FunctionEnd

Function BSI_ReadyLeave
  ${NSD_GetText} $BSI.PathEdit $BSI.PathValue
  ${If} $BSI.PathValue == ""
    ${NSD_SetText} $BSI.PathError "Choose an installation location before continuing."
    Abort
  ${EndIf}
  StrCpy $INSTDIR "$BSI.PathValue"
  ; Persist the bespoke choices across Electron Builder's UAC outer/inner handoff.
  WriteINIStr "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini" "installer" "scope" "$BSI.Scope"
  WriteINIStr "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini" "installer" "path" "$BSI.PathValue"
  WriteINIStr "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini" "installer" "pathDirty" "$BSI.PathDirty"
FunctionEnd

Function BSI_BridgePre
  ; Hidden bridge page: install mode/elevation has run; restore the user's path
  ; without ever exposing Electron Builder's directory page.
  ${If} $BSI.PathDirty == "1"
    StrCpy $INSTDIR "$BSI.PathValue"
  ${EndIf}
  Abort
FunctionEnd

Function BSI_ToggleLaunch
  Pop $R0
  ${If} $BSI.LaunchNow == "1"
    StrCpy $BSI.LaunchNow "0"
    StrCpy $BSI.LaunchOnExit "0"
    !insertmacro BSI_SKIN_BUTTON $BSI.LaunchButton "bsi-toggle-off.bmp"
  ${Else}
    StrCpy $BSI.LaunchNow "1"
    StrCpy $BSI.LaunchOnExit "1"
    !insertmacro BSI_SKIN_BUTTON $BSI.LaunchButton "bsi-toggle-on.bmp"
  ${EndIf}
FunctionEnd

Function BSI_InstallShow
  FindWindow $R0 "#32770" "" $HWNDPARENT
  ${If} $R0 == 0
    Return
  ${EndIf}
  LockWindow on
  SetCtlColors $R0 ${BSI_TEXT} ${BSI_BG}
  GetDlgItem $R1 $R0 1006
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}
  GetDlgItem $R1 $R0 1016
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}
  FindWindow $R1 "SysListView32" "" $R0
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}
  GetDlgItem $R1 $R0 1027
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}

  !insertmacro BSI_ATTACH_NATIVE_SHELL $R0
  ; BSI_ATTACH_NATIVE_SHELL leaves $R4/$R5 as the current content width/height.
  !insertmacro BSI_RECT 17 7 42 7 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $R7 $R0 $R1 $R2 $R3 $R6 "${BSI_PROJECT_NAME}" $BSI.FontBrand ${BSI_ACCENT}
  !insertmacro BSI_RECT 17 14 42 7 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $R7 $R0 $R1 $R2 $R3 $R6 "${BSI_GAME_NAME} · ACHIEVEMENT TRACKER" $BSI.FontMicro ${BSI_MUTED}
  !insertmacro BSI_RECT 5 33 52 12 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $BSI.InstallTitle $R0 $R1 $R2 $R3 $R6 "INSTALLING ${BSI_PROJECT_NAME}" $BSI.FontTitle ${BSI_TEXT}
  !insertmacro BSI_RECT 5 47 52 9 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $BSI.InstallStatus $R0 $R1 $R2 $R3 $R6 "Copying application files…" $BSI.FontBody ${BSI_MUTED}
  !insertmacro BSI_RECT 5 77 52 8 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $BSI.InstallNote $R0 $R1 $R2 $R3 $R6 "${BSI_SAFE_COPY}" $BSI.FontMicro ${BSI_MUTED}

  GetDlgItem $BSI.InstallProgress $R0 1004
  ${If} $BSI.InstallProgress != 0
    System::Call 'uxtheme::SetWindowTheme(p $BSI.InstallProgress, w "", w "")i .r2'
    SendMessage $BSI.InstallProgress 0x2001 0 ${BSI_PROGRESS_BG_COLORREF}
    SendMessage $BSI.InstallProgress 0x0409 0 ${BSI_ACCENT_COLORREF}
    !insertmacro BSI_RECT 5 60 52 4 $R1 $R2 $R3 $R6
    System::Call 'user32::SetWindowPos(p $BSI.InstallProgress, p -1, i r1, i r2, i r3, i r6, i 0x0010)i .r7'
    ShowWindow $BSI.InstallProgress ${SW_SHOW}
  ${EndIf}

  StrCpy $BSI.LaunchButton "0"
  StrCpy $BSI.LaunchLabel "0"
  StrCpy $BSI.LaunchNow "1"
  !insertmacro BSI_NAV "bsi-btn-next.bmp" ${SW_HIDE} ${SW_SHOW}
  LockWindow off
FunctionEnd

Function BSI_InstallCompleted
  StrCpy $BSI.LaunchNow "1"
  StrCpy $BSI.LaunchOnExit "1"
  ; Stay on the same visible surface: mutate Installing -> Complete in place.
  ${If} $BSI.InstallProgress != 0
    SendMessage $BSI.InstallProgress 0x0402 100 0
  ${EndIf}
  ${If} $BSI.InstallTitle != 0
    SendMessage $BSI.InstallTitle ${WM_SETTEXT} 0 "STR:INSTALLATION COMPLETE"
  ${EndIf}
  ${If} $BSI.InstallStatus != 0
    SendMessage $BSI.InstallStatus ${WM_SETTEXT} 0 "STR:${BSI_COMPLETE_COPY}"
  ${EndIf}
  ${If} $BSI.InstallNote != 0
    SendMessage $BSI.InstallNote ${WM_SETTEXT} 0 "STR:Choose whether to launch the tracker, then select Finish."
  ${EndIf}

  ; Create the bespoke launch toggle only after deployment has completed.
  FindWindow $R0 "#32770" "" $HWNDPARENT
  ${If} $R0 != 0
    System::Call '*(&i4 .r1, &i4 .r2, &i4 .r4, &i4 .r5) p.r3'
    System::Call 'user32::GetClientRect(p r0, p r3)i .r6'
    System::Call '*$3(i .r1, i .r2, i .r4, i .r5)'
    System::Free $3
    !insertmacro BSI_RECT 5 68 5 8 $R1 $R2 $R3 $R6
    System::Call 'user32::CreateWindowExW(i 0, w "BUTTON", w "", i ${WS_CHILD}|${WS_VISIBLE}|${WS_TABSTOP}|${BS_BITMAP}|${BS_FLAT}, i r1, i r2, i r3, i r6, p r0, p 0, p 0, p 0)p.r7'
    StrCpy $BSI.LaunchButton $R7
    !insertmacro BSI_SKIN_BUTTON $BSI.LaunchButton "bsi-toggle-on.bmp"
    ${NSD_OnClick} $BSI.LaunchButton BSI_ToggleLaunch
    !insertmacro BSI_RECT 11 68 46 8 $R1 $R2 $R3 $R6
    !insertmacro BSI_NATIVE_STATIC $BSI.LaunchLabel $R0 $R1 $R2 $R3 $R6 "Launch ${BSI_PROJECT_NAME}" $BSI.FontBody ${BSI_TEXT}
  ${EndIf}

  GetDlgItem $R0 $HWNDPARENT 1
  ShowWindow $R0 ${SW_SHOW}
  EnableWindow $R0 1
  !insertmacro BSI_SKIN_BUTTON $R0 "bsi-btn-finish.bmp"
  GetDlgItem $R1 $HWNDPARENT 2
  ShowWindow $R1 ${SW_HIDE}
  EnableWindow $R1 0
FunctionEnd

Function BSI_ShowInstallError
  ${If} $BSI.InstallProgress != 0
    ShowWindow $BSI.InstallProgress ${SW_HIDE}
  ${EndIf}
  ${If} $BSI.InstallTitle != 0
    SendMessage $BSI.InstallTitle ${WM_SETTEXT} 0 "STR:INSTALLATION FAILED"
  ${EndIf}
  ${If} $BSI.InstallStatus != 0
    SendMessage $BSI.InstallStatus ${WM_SETTEXT} 0 "STR:The installation could not be completed."
  ${EndIf}
  ${If} $BSI.InstallNote != 0
    SendMessage $BSI.InstallNote ${WM_SETTEXT} 0 "STR:No additional action is required here. Close setup and retry when ready."
  ${EndIf}
  GetDlgItem $R0 $HWNDPARENT 1
  ShowWindow $R0 ${SW_SHOW}
  EnableWindow $R0 1
  !insertmacro BSI_SKIN_BUTTON $R0 "bsi-btn-close.bmp"
  GetDlgItem $R1 $HWNDPARENT 2
  ShowWindow $R1 ${SW_HIDE}
  EnableWindow $R1 0
FunctionEnd

Function .onInstFailed
  Call BSI_ShowInstallError
FunctionEnd


Function BSI_WaitForPreviousInstallRelease
  StrCpy $BSI.UpgradeSettleCount 0
BSI_UpgradeSettleLoop:
  IfFileExists "$INSTDIR\${BSI_UNINSTALL_FILENAME}" 0 BSI_UpgradeSettleDone
  IntOp $BSI.UpgradeSettleCount $BSI.UpgradeSettleCount + 1
  IntCmp $BSI.UpgradeSettleCount 60 BSI_UpgradeSettleStop 0 BSI_UpgradeSettleStop
  Sleep 250
  Goto BSI_UpgradeSettleLoop
BSI_UpgradeSettleStop:
  ; Do not expose an installer-owned native warning dialog. Abort safely; the
  ; existing installation remains intact and the setup process returns failure.
  SetErrorLevel 5
  Abort
BSI_UpgradeSettleDone:
  Sleep 500
  SetOutPath "$INSTDIR"
FunctionEnd

Function .onGUIEnd
  Delete "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini"
  ${If} $BSI.NativeShellImage != 0
    System::Call 'gdi32::DeleteObject(p $BSI.NativeShellImage)i .r0'
  ${EndIf}
  StrCmp $BSI.LaunchOnExit "1" 0 BSI_GUIEndDone
  IfFileExists "$INSTDIR\${PRODUCT_FILENAME}.exe" 0 BSI_GUIEndDone
  Call BSI_LaunchAtUserLevel
BSI_GUIEndDone:
FunctionEnd

!else ; BUILD_UNINSTALLER

Function un.BSI_SkipHiddenComponents
  Abort
FunctionEnd

Function un.BSI_ReadyCreate
  ${If} $BSI.IsInner == "1"
    Abort
  ${EndIf}
  nsDialogs::Create 1044
  Pop $BSI.Dialog
  ${If} $BSI.Dialog == error
    Abort
  ${EndIf}
  !insertmacro BSI_PAGE_SHELL
  !insertmacro BSI_PAGE_LABEL 17% 7% 42% 7% "${BSI_PROJECT_NAME}" $BSI.FontBrand ${BSI_ACCENT} $R0
  !insertmacro BSI_PAGE_LABEL 17% 14% 42% 7% "${BSI_GAME_NAME} · ACHIEVEMENT TRACKER" $BSI.FontMicro ${BSI_MUTED} $R0
  !insertmacro BSI_PAGE_LABEL 5% 33% 52% 11% "CONFIRM UNINSTALL" $BSI.FontTitle ${BSI_TEXT} $R0
  !insertmacro BSI_PAGE_LABEL 5% 46% 52% 18% "${BSI_UNINSTALL_READY_COPY}" $BSI.FontBody ${BSI_MUTED} $R0
  !insertmacro BSI_PAGE_LABEL 5% 78% 52% 8% "${BSI_SAFE_COPY}" $BSI.FontMicro ${BSI_MUTED} $R0
  !insertmacro BSI_NAV "bsi-btn-remove.bmp" ${SW_SHOW} ${SW_SHOW}
  nsDialogs::Show
  ${NSD_FreeImage} $BSI.ShellHandle
FunctionEnd

Function un.BSI_ReadyLeave
FunctionEnd

Function un.BSI_InstallShow
  FindWindow $R0 "#32770" "" $HWNDPARENT
  ${If} $R0 == 0
    Return
  ${EndIf}
  LockWindow on
  SetCtlColors $R0 ${BSI_TEXT} ${BSI_BG}
  GetDlgItem $R1 $R0 1006
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}
  GetDlgItem $R1 $R0 1016
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}
  FindWindow $R1 "SysListView32" "" $R0
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}
  GetDlgItem $R1 $R0 1027
  ${If} $R1 != 0
    ShowWindow $R1 ${SW_HIDE}
  ${EndIf}

  !insertmacro BSI_ATTACH_NATIVE_SHELL $R0
  !insertmacro BSI_RECT 17 7 42 7 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $R7 $R0 $R1 $R2 $R3 $R6 "${BSI_PROJECT_NAME}" $BSI.FontBrand ${BSI_ACCENT}
  !insertmacro BSI_RECT 17 14 42 7 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $R7 $R0 $R1 $R2 $R3 $R6 "${BSI_GAME_NAME} · ACHIEVEMENT TRACKER" $BSI.FontMicro ${BSI_MUTED}
  !insertmacro BSI_RECT 5 35 52 12 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $BSI.UninstallTitle $R0 $R1 $R2 $R3 $R6 "REMOVING ${BSI_PROJECT_NAME}" $BSI.FontTitle ${BSI_TEXT}
  !insertmacro BSI_RECT 5 49 52 9 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $BSI.UninstallStatus $R0 $R1 $R2 $R3 $R6 "Removing application files…" $BSI.FontBody ${BSI_MUTED}
  !insertmacro BSI_RECT 5 77 52 8 $R1 $R2 $R3 $R6
  !insertmacro BSI_NATIVE_STATIC $BSI.UninstallNote $R0 $R1 $R2 $R3 $R6 "${BSI_SAFE_COPY}" $BSI.FontMicro ${BSI_MUTED}

  GetDlgItem $BSI.UninstallProgress $R0 1004
  ${If} $BSI.UninstallProgress != 0
    System::Call 'uxtheme::SetWindowTheme(p $BSI.UninstallProgress, w "", w "")i .r2'
    SendMessage $BSI.UninstallProgress 0x2001 0 ${BSI_PROGRESS_BG_COLORREF}
    SendMessage $BSI.UninstallProgress 0x0409 0 ${BSI_ACCENT_COLORREF}
    !insertmacro BSI_RECT 5 62 52 4 $R1 $R2 $R3 $R6
    System::Call 'user32::SetWindowPos(p $BSI.UninstallProgress, p -1, i r1, i r2, i r3, i r6, i 0x0010)i .r7'
    ShowWindow $BSI.UninstallProgress ${SW_SHOW}
  ${EndIf}
  ; MUI owns enabled state until file removal has completed. Keep the bespoke
  ; Next/Close control visible so completion is an in-place state change.
  !insertmacro BSI_NAV "bsi-btn-close.bmp" ${SW_SHOW} ${SW_SHOW}
  LockWindow off
FunctionEnd

Function un.BSI_InstallCompleted
  ${If} $BSI.UninstallProgress != 0
    SendMessage $BSI.UninstallProgress 0x0402 100 0
  ${EndIf}
  ${If} $BSI.UninstallTitle != 0
    SendMessage $BSI.UninstallTitle ${WM_SETTEXT} 0 "STR:UNINSTALL COMPLETE"
  ${EndIf}
  ${If} $BSI.UninstallStatus != 0
    SendMessage $BSI.UninstallStatus ${WM_SETTEXT} 0 "STR:${BSI_UNINSTALL_COMPLETE_COPY}"
  ${EndIf}
  ${If} $BSI.UninstallNote != 0
    SendMessage $BSI.UninstallNote ${WM_SETTEXT} 0 "STR:Select Close to exit."
  ${EndIf}
  GetDlgItem $R0 $HWNDPARENT 1
  ShowWindow $R0 ${SW_SHOW}
  EnableWindow $R0 1
  !insertmacro BSI_SKIN_BUTTON $R0 "bsi-btn-close.bmp"
  GetDlgItem $R1 $HWNDPARENT 2
  ShowWindow $R1 ${SW_HIDE}
  EnableWindow $R1 0
FunctionEnd

Function un.BSI_ShowUninstallError
  ${If} $BSI.UninstallProgress != 0
    ShowWindow $BSI.UninstallProgress ${SW_HIDE}
  ${EndIf}
  ${If} $BSI.UninstallTitle != 0
    SendMessage $BSI.UninstallTitle ${WM_SETTEXT} 0 "STR:UNINSTALL FAILED"
  ${EndIf}
  ${If} $BSI.UninstallStatus != 0
    SendMessage $BSI.UninstallStatus ${WM_SETTEXT} 0 "STR:The application could not be completely removed."
  ${EndIf}
  ${If} $BSI.UninstallNote != 0
    SendMessage $BSI.UninstallNote ${WM_SETTEXT} 0 "STR:Close this window, then retry the uninstall when ready."
  ${EndIf}
  GetDlgItem $R0 $HWNDPARENT 1
  ShowWindow $R0 ${SW_SHOW}
  EnableWindow $R0 1
  !insertmacro BSI_SKIN_BUTTON $R0 "bsi-btn-close.bmp"
  GetDlgItem $R1 $HWNDPARENT 2
  ShowWindow $R1 ${SW_HIDE}
  EnableWindow $R1 0
FunctionEnd

Function un.onUninstFailed
  Call un.BSI_ShowUninstallError
FunctionEnd

Function un.BSI_SkipDefaultFinish
  Abort
FunctionEnd

Function un.onGUIEnd
  ${If} $BSI.NativeShellImage != 0
    System::Call 'gdi32::DeleteObject(p $BSI.NativeShellImage)i .r0'
  ${EndIf}
FunctionEnd

!endif ; BUILD_UNINSTALLER

!macro customHeader
  !ifdef BUILD_UNINSTALLER
    Caption "${BSI_TRACKER_NAME} — Uninstall"
  !else
    Caption "${BSI_TRACKER_NAME} — Setup"
  !endif
  BrandingText "${BSI_PROJECT_NAME} · ${BSI_GAME_NAME} · Phil Forster"
!macroend

!macro customInstallMode
  !ifdef BUILD_UNINSTALLER
    ${If} $installMode == "all"
      StrCpy $isForceMachineInstall "1"
    ${Else}
      StrCpy $isForceCurrentInstall "1"
    ${EndIf}
  !else
    ${If} $BSI.Scope == "all"
      StrCpy $isForceMachineInstall "1"
    ${Else}
      StrCpy $isForceCurrentInstall "1"
    ${EndIf}
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
  !macro customInit
    StrCpy $BSI.IsInner "0"
    StrCpy $BSI.LaunchOnExit "0"
    StrCpy $BSI.LaunchNow "1"
    StrCpy $BSI.PathDirty "0"
    ${If} ${UAC_IsInnerInstance}
      StrCpy $BSI.IsInner "1"
    ${EndIf}
    ${If} $installMode == "all"
      StrCpy $BSI.Scope "all"
    ${Else}
      StrCpy $BSI.Scope "current"
    ${EndIf}
    ${If} $BSI.IsInner == "1"
      ReadINIStr $BSI.Scope "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini" "installer" "scope"
      ReadINIStr $BSI.PathValue "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini" "installer" "path"
      ReadINIStr $BSI.PathDirty "$TEMP\${PRODUCT_FILENAME}-bsi-state.ini" "installer" "pathDirty"
    ${EndIf}
    !insertmacro BSI_EXTRACT_UI "installer"
    !insertmacro BSI_CREATE_FONTS ""
  !macroend

  !macro customWelcomePage
    Page custom BSI_ReadyCreate BSI_ReadyLeave
  !macroend

  !macro customPageAfterChangeDir
    Page custom BSI_BridgePre
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW BSI_InstallShow
  !macroend

  !macro customInstall
    Call BSI_InstallCompleted
  !macroend

  !macro customUnInstallCheck
    ${If} $R0 != 0
      SetErrorLevel $R0
      Abort
    ${EndIf}
    Call BSI_WaitForPreviousInstallRelease
  !macroend

  !macro customUnInstallCheckCurrentUser
    ${If} $R0 != 0
      SetErrorLevel $R0
      Abort
    ${EndIf}
    Call BSI_WaitForPreviousInstallRelease
  !macroend

  !macro customFinishPage
    ; Define the launch broker here, not in the early shared include body. Electron
    ; Builder expands customFinishPage from assistedInstaller.nsh at the same late
    ; compile point where its own StartApp uses StdUtils.ExecShellAsUser, after the
    ; builder's NSIS plug-in paths/macros are available. The visible stock Finish
    ; page remains skipped; our bespoke completion state still owns the UI.
    Function BSI_LaunchAtUserLevel
      ${StdUtils.ExecShellAsUser} $R0 "$INSTDIR\${PRODUCT_FILENAME}.exe" "open" ""
    FunctionEnd
  !macroend

!else
  !macro customUnInit
    StrCpy $BSI.IsInner "0"
    ${If} ${UAC_IsInnerInstance}
      StrCpy $BSI.IsInner "1"
    ${EndIf}
    !insertmacro BSI_EXTRACT_UI "uninstaller"
    !insertmacro BSI_CREATE_FONTS "un."
  !macroend

  !macro customUnWelcomePage
    UninstPage custom un.BSI_ReadyCreate un.BSI_ReadyLeave
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW un.BSI_InstallShow
  !macroend

  ; Electron Builder calls customUnInstall before file removal, so completion
  ; must not be signalled there. This hidden required section is inserted after
  ; the engine's main uninstall section and therefore provides a true synchronous
  ; Removing -> Complete transition without timers or a second visible page.
  !macro customUnInstallSection
    Section "un.BSI finalise removal"
      SectionIn RO
      Call un.BSI_InstallCompleted
    SectionEnd
  !macroend

  !macro customUninstallPage
    !define MUI_PAGE_CUSTOMFUNCTION_PRE un.BSI_SkipDefaultFinish
  !macroend
!endif
