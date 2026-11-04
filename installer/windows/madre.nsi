; SPDX-License-Identifier: BUSL-1.1
; MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
;
; MADRE's installer for Windows (1.1.1, docs/WINDOWS.md WIN-033). One file, opened with a double
; click; nobody types in PowerShell or in a terminal. On Windows MADRE runs inside WSL2 (D-001), so
; this installer:
;   1. turns WSL on when it is off: the only step that asks Windows for permission, and the only
;      one that may need a restart (after it, «MADRE» on the desktop finishes the install). It asks
;      for that restart once: if Windows already restarted and WSL still is not the one MADRE needs,
;      what is missing is a Windows update, and it says so instead of asking again (1.0.1). When the
;      Linux will not start, it asks Windows why (windows-ready.ps1) before blaming the BIOS: with
;      virtualization on, what is off is Windows' Virtual Machine Platform, which it turns on
;      (1.0.2);
;   2. creates a Linux of MADRE's own named «MADRE», from Ubuntu 24.04, with no account to create:
;      the person's Ubuntu, if there is one, is never touched;
;   3. inside it, as root, runs inside-setup.sh: the user, Node, zstd, wslu and MADRE;
;   4. leaves «MADRE» in the Start menu and on the desktop (MADRE.exe, launcher.nsi), which opens
;      it in the browser with no window of its own, and an entry in Installed apps to remove it.
; Opened again, it repairs and updates: the same steps, each skipped when already done.
;
; Some antivirus judge a file by how it looks, not by what it does, and an unsigned installer that
; looks packed or writes itself into the next sign-in scores as malware (VirusTotal 4/71 on the
; first one, all machine-learning guesses; Microsoft Defender clean). So: nothing compressed, full
; version information, and no RunOnce.
;
; The file is published once and kept: it installs the MADRE npm has as latest, so a new version of
; MADRE needs no new installer, and browsers and SmartScreen judge a file by its reputation, which
; a new hash starts from zero. Its own number (VERSION) moves only when the installer changes.
;
; Built by scripts/windows-installer.mjs with makensis (NSIS 3). Never run on a real Windows by its
; author's machine: it is tested by hand on Windows 10 and 11 before each release (WIN-032).

Unicode true
SetCompress off

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"

; The installer's own number, not MADRE's.
!define VERSION "1.0.3"
!ifndef OUTFILE
  !define OUTFILE "MADRE-Instalador.exe"
!endif
!define DISTRO "MADRE"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MADRE"
; Where the installer remembers when it asked for a restart (the start of that Windows session).
!define STATE_KEY "Software\MADRE\Instalador"
!define HELP_URL "https://madre.run/windows"

Name "MADRE"
OutFile "${OUTFILE}"
; Per user, no administrator: WSL keeps each Linux per user, and the shortcuts are this user's.
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\MADRE"
ShowInstDetails hide
ShowUninstDetails hide
BrandingText "madre.run"
VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=0 "ProductName" "MADRE"
VIAddVersionKey /LANG=0 "CompanyName" "Jossue Alcalá"
VIAddVersionKey /LANG=0 "FileDescription" "Instalador de MADRE"
VIAddVersionKey /LANG=0 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=0 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=0 "InternalName" "MADRE-Instalador"
VIAddVersionKey /LANG=0 "OriginalFilename" "MADRE-Instalador.exe"
VIAddVersionKey /LANG=0 "LegalCopyright" "© 2026 Jossue Alcalá"
VIAddVersionKey /LANG=0 "Comments" "https://madre.run/windows"

!define MUI_ICON "madre.ico"
!define MUI_UNICON "madre.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\MADRE.exe"
!define MUI_FINISHPAGE_RUN_TEXT "$(OpenNow)"
!define MUI_FINISHPAGE_LINK "$(HelpLink)"
!define MUI_FINISHPAGE_LINK_LOCATION "${HELP_URL}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; The first language is the one for a Windows in any other language.
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"

LangString OpenNow ${LANG_ENGLISH} "Open MADRE now"
LangString OpenNow ${LANG_SPANISH} "Abrir MADRE ahora"
LangString HelpLink ${LANG_ENGLISH} "Help with MADRE on Windows"
LangString HelpLink ${LANG_SPANISH} "Ayuda con MADRE en Windows"
LangString OldWindows ${LANG_ENGLISH} "MADRE needs Windows 10 (version 21H1 or newer) or Windows 11, 64-bit.$\r$\n$\r$\nWindows Update brings Windows 10 up to 22H2 for free."
LangString OldWindows ${LANG_SPANISH} "MADRE necesita Windows 10 (versión 21H1 o más nueva) o Windows 11, de 64 bits.$\r$\n$\r$\nWindows Update lleva Windows 10 hasta la 22H2 sin costo."
LangString StepWsl ${LANG_ENGLISH} "Checking WSL, the Linux that comes with Windows…"
LangString StepWsl ${LANG_SPANISH} "Revisando WSL, el Linux que viene con Windows…"
LangString StepWslOn ${LANG_ENGLISH} "Turning WSL on. Windows will ask for permission once."
LangString StepWslOn ${LANG_SPANISH} "Encendiendo WSL. Windows te pedirá permiso una vez."
LangString StepDistro ${LANG_ENGLISH} "Preparing MADRE's Linux (a few minutes, it downloads about 400 MB)…"
LangString StepDistro ${LANG_SPANISH} "Preparando el Linux de MADRE (unos minutos: descarga unos 400 MB)…"
LangString StepUpdate ${LANG_ENGLISH} "Updating WSL. Windows will ask for permission once."
LangString StepUpdate ${LANG_SPANISH} "Actualizando WSL. Windows te pedirá permiso una vez."
LangString StepInside ${LANG_ENGLISH} "Installing Node.js and MADRE inside it…"
LangString StepInside ${LANG_SPANISH} "Instalando Node.js y MADRE adentro…"
LangString StepShortcuts ${LANG_ENGLISH} "Adding MADRE to the Start menu and the desktop…"
LangString StepShortcuts ${LANG_SPANISH} "Agregando MADRE al menú Inicio y al escritorio…"
LangString Restart ${LANG_ENGLISH} "Windows needs to restart to finish turning on what MADRE needs.$\r$\n$\r$\nWhen you come back, open «MADRE» on your desktop and the install finishes. Restart now?"
LangString Restart ${LANG_SPANISH} "Windows tiene que reiniciar para terminar de encender lo que MADRE necesita.$\r$\n$\r$\nAl volver, abre «MADRE» en tu escritorio y termina de instalarse. ¿Reiniciar ahora?"
LangString RestartLater ${LANG_ENGLISH} "Restart Windows when you can. Then open «MADRE» on your desktop and the install finishes."
LangString RestartLater ${LANG_SPANISH} "Reinicia Windows cuando puedas. Después abre «MADRE» en tu escritorio y termina de instalarse."
LangString StepPlatform ${LANG_ENGLISH} "Turning on Windows' Virtual Machine Platform. Windows will ask for permission once."
LangString StepPlatform ${LANG_SPANISH} "Encendiendo la Plataforma de máquina virtual de Windows. Windows te pedirá permiso una vez."
LangString NoPermission ${LANG_ENGLISH} "Without Windows' permission, WSL cannot be turned on, and MADRE needs it.$\r$\n$\r$\nOpen this installer again and say Yes when Windows asks. If Windows asks for a password you don't have, this account is not an administrator: whoever manages this computer has to say Yes."
LangString NoPermission ${LANG_SPANISH} "Sin el permiso de Windows no se puede encender WSL, y MADRE lo necesita.$\r$\n$\r$\nVuelve a abrir este instalador y responde Sí cuando Windows pregunte. Si Windows pide una contraseña que no tienes, esta cuenta no es de administrador: quien administra esta computadora tiene que responder Sí."
LangString WslStillOld ${LANG_ENGLISH} "Windows already restarted, but it still doesn't have the WSL MADRE needs. Restarting again won't fix it: what's missing is a Windows update.$\r$\n$\r$\nOpen Windows Update, install everything pending (on Windows 10, KB5020030 or newer), restart, and open «MADRE» on your desktop again.$\r$\n$\r$\nThe help page shows it step by step. Open it?"
LangString WslStillOld ${LANG_SPANISH} "Windows ya se reinició, pero sigue sin el WSL que MADRE necesita. Reiniciar otra vez no lo arregla: falta una actualización de Windows.$\r$\n$\r$\nAbre Windows Update, instala todo lo pendiente (en Windows 10, la KB5020030 o más nueva), reinicia y vuelve a abrir «MADRE» en tu escritorio.$\r$\n$\r$\nLa página de ayuda lo explica paso a paso. ¿Abrirla?"
LangString NoVirtualization ${LANG_ENGLISH} "Windows says virtualization is off on this computer, so MADRE's Linux cannot start. It is turned on in the BIOS/UEFI; if this is a virtual machine, in the program that runs it (nested virtualization).$\r$\n$\r$\nThe help page shows how, step by step. Open it?"
LangString NoVirtualization ${LANG_SPANISH} "Windows dice que la virtualización está apagada en esta computadora, así que el Linux de MADRE no puede arrancar. Se enciende en la BIOS/UEFI; si es una máquina virtual, en el programa que la corre (virtualización anidada).$\r$\n$\r$\nLa página de ayuda explica cómo, paso a paso. ¿Abrirla?"
LangString PlatformStillOff ${LANG_ENGLISH} "Windows already restarted, but its Virtual Machine Platform is still off, and MADRE's Linux needs it.$\r$\n$\r$\nThe help page shows how to turn it on by hand. Open it?"
LangString PlatformStillOff ${LANG_SPANISH} "Windows ya se reinició, pero su Plataforma de máquina virtual sigue apagada, y el Linux de MADRE la necesita.$\r$\n$\r$\nLa página de ayuda explica cómo encenderla a mano. ¿Abrirla?"
LangString LinuxFailed ${LANG_ENGLISH} "Virtualization and WSL are on, but Windows could not create or start MADRE's Linux. It downloads about 400 MB: check your internet connection and open this installer again.$\r$\n$\r$\nShow details has Windows' own error, and the help page says what to check. Open it?"
LangString LinuxFailed ${LANG_SPANISH} "La virtualización y WSL están encendidos, pero Windows no pudo crear o arrancar el Linux de MADRE. Descarga unos 400 MB: revisa tu conexión a internet y vuelve a abrir este instalador.$\r$\n$\r$\nEn «Mostrar detalles» está el error de Windows, y la página de ayuda dice qué revisar. ¿Abrirla?"
LangString InsideFailed ${LANG_ENGLISH} "MADRE could not finish installing inside its Linux. Check your internet connection and open this installer again: it continues where it stopped.$\r$\n$\r$\nWhat happened is saved in $INSTDIR\instalacion.log. If it fails again, send its last lines from madre.run/en/report."
LangString InsideFailed ${LANG_SPANISH} "MADRE no pudo terminar de instalarse dentro de su Linux. Revisa tu conexión a internet y vuelve a abrir este instalador: sigue donde se quedó.$\r$\n$\r$\nLo que pasó quedó guardado en $INSTDIR\instalacion.log. Si vuelve a fallar, manda sus últimas líneas desde madre.run/reportar."
LangString RemoveLinux ${LANG_ENGLISH} "Also delete MADRE's Linux and everything saved inside it (your projects there included)?$\r$\n$\r$\nIf you say No, it stays, and installing MADRE again finds it as it was."
LangString RemoveLinux ${LANG_SPANISH} "¿Borrar también el Linux de MADRE y todo lo guardado adentro (tus proyectos ahí incluidos)?$\r$\n$\r$\nSi dices que no, se queda, y al volver a instalar MADRE lo encuentra como estaba."

Var Wsl
Var TurnedOn

; wsl.exe lives in System32. This installer is a 32-bit program: on 64-bit Windows it sees
; System32 through Sysnative, where wsl.exe really is.
!macro FindWsl
  ${If} ${FileExists} "$WINDIR\Sysnative\wsl.exe"
    StrCpy $Wsl "$WINDIR\Sysnative\wsl.exe"
  ${Else}
    StrCpy $Wsl "$SYSDIR\wsl.exe"
  ${EndIf}
  ; wsl.exe speaks UTF-16 unless told otherwise; the details pane reads UTF-8.
  System::Call 'Kernel32::SetEnvironmentVariable(t "WSL_UTF8", t "1")i'
!macroend

Function .onInit
  ${IfNot} ${AtLeastWin10}
  ; 21H1 (19043): the oldest Windows 10 the Store's WSL runs on, the only one that knows --name.
  ${OrIfNot} ${AtLeastBuild} 19043
  ${OrIfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "$(OldWindows)"
    Abort
  ${EndIf}
  !insertmacro FindWsl
FunctionEnd

; When this Windows session started, in seconds since 1601: now minus the time since boot. The
; same number while Windows stays on; a restart moves it.
!macro BootTime result
  System::Call 'kernel32::GetSystemTimeAsFileTime(*l .r8)'
  System::Call 'kernel32::GetTickCount64()l .r9'
  System::Int64Op $8 / 10000000
  Pop $8
  System::Int64Op $9 / 1000
  Pop $9
  System::Int64Op $8 - $9
  Pop ${result}
!macroend

; A System32 program run as administrator, after Windows' permission, waiting for it. The error
; flag is the permission refused. This installer is 32-bit and sees System32 as Sysnative, but the
; elevation is done by a 64-bit Windows service that has no Sysnative: handed that path, it fails
; even when the person says Yes (1.0.1's «without Windows' permission», MR-B7MVZ5). So the elevated
; cmd finds the real program itself, whichever cmd Windows starts.
!macro RunAsAdmin exe args
  ClearErrors
  ExecShellWait "runas" "$SYSDIR\cmd.exe" '/d /c if exist "%WINDIR%\Sysnative\${exe}" ("%WINDIR%\Sysnative\${exe}" ${args}) else ("%WINDIR%\System32\${exe}" ${args})' SW_HIDE
!macroend

; Why MADRE's Linux does not start, from Windows itself (windows-ready.ps1): 0 nothing missing,
; 1 virtualization off, 2 the Virtual Machine Platform off, anything else Windows did not say.
!macro WindowsReady result
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "windows-ready.ps1"
  nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\windows-ready.ps1"'
  Pop ${result}
  SetOutPath "$INSTDIR"
!macroend

; Is MADRE's Linux there and answering? 0 when it is.
!macro DistroAnswers result
  nsExec::Exec '"$Wsl" -d ${DISTRO} -u root -- true'
  Pop ${result}
!macroend

Section "MADRE" Main
  SetOutPath "$INSTDIR"
  StrCpy $TurnedOn "0"

  ; 1 · WSL itself.
  DetailPrint "$(StepWsl)"
  ; `--version` only answers from the WSL that installs Linux by name (2.x, from the Store): the
  ; one Windows 10 brings inside, or none, fails here and is brought in the same way.
  nsExec::ExecToLog '"$Wsl" --version'
  Pop $0
  ${If} $0 != 0
    DetailPrint "$(StepWslOn)"
    ; The error flag is Windows' permission refused: then nothing was turned on, and no restart
    ; would change that.
    !insertmacro RunAsAdmin "wsl.exe" "--install --no-distribution --web-download"
    ${If} ${Errors}
      MessageBox MB_ICONEXCLAMATION "$(NoPermission)"
      Abort
    ${EndIf}
    StrCpy $TurnedOn "1"
  ${EndIf}

  ; 2 · MADRE's own Linux.
  !insertmacro DistroAnswers $0
  ${If} $0 != 0
    DetailPrint "$(StepDistro)"
    nsExec::ExecToLog '"$Wsl" --install Ubuntu-24.04 --name ${DISTRO} --no-launch --web-download'
    Pop $0
    ; An older WSL does not know --name: brought up to date, then once more.
    ${If} $0 != 0
    ${AndIf} $TurnedOn == "0"
      DetailPrint "$(StepUpdate)"
      !insertmacro RunAsAdmin "wsl.exe" "--update --web-download"
      ${If} ${Errors}
        MessageBox MB_ICONEXCLAMATION "$(NoPermission)"
        Abort
      ${EndIf}
      nsExec::ExecToLog '"$Wsl" --install Ubuntu-24.04 --name ${DISTRO} --no-launch --web-download'
      Pop $0
    ${EndIf}
    !insertmacro DistroAnswers $0
    ${If} $0 != 0
      ; Whether a restart was asked for, and whether Windows has restarted since: «pending» is a
      ; restart still owed, «done» one that already happened (BootTime moved). Then the reason
      ; comes from Windows itself, never assumed (1.0.2): only virtualization that Windows reports
      ; off is the BIOS.
      !insertmacro BootTime $1
      StrCpy $6 "none"
      ClearErrors
      ReadRegStr $2 HKCU "${STATE_KEY}" "RestartAsked"
      ${IfNot} ${Errors}
        System::Int64Op $1 - $2
        Pop $3
        System::Int64Op $3 > 60
        Pop $3
        StrCpy $6 "pending"
        ${If} $3 == 1
          StrCpy $6 "done"
        ${EndIf}
      ${EndIf}
      ${If} $6 == "pending"
        Goto restart
      ${EndIf}
      !insertmacro WindowsReady $5
      ${If} $5 == "1"
        MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(NoVirtualization)" IDNO stop
          ExecShell "open" "${HELP_URL}#virtualizacion"
        stop:
        Abort
      ${EndIf}
      ${If} $TurnedOn == "1"
        ; `wsl --version` failing again after the restart this installer asked for is a Windows
        ; without the Store's WSL (Windows 10 without KB5020030): another restart would bring the
        ; person back here forever. A shutdown with Fast Startup keeps the session's start, so it
        ; asks once more; a restart, which is what it asks for, does not.
        ${If} $6 == "done"
          MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(WslStillOld)" IDNO old
            ExecShell "open" "${HELP_URL}#actualizar"
          old:
          Abort
        ${EndIf}
        Goto restart
      ${EndIf}
      ${If} $5 == "2"
        ; WSL is there and virtualization is on: what is off is Windows' own part. The Store's
        ; WSL never turns it on by itself, and without it the Linux cannot start.
        ${If} $6 == "done"
          MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(PlatformStillOff)" IDNO platform
            ExecShell "open" "${HELP_URL}#plataforma"
          platform:
          Abort
        ${EndIf}
        DetailPrint "$(StepPlatform)"
        !insertmacro RunAsAdmin "dism.exe" "/online /enable-feature /featurename:VirtualMachinePlatform /all /norestart"
        ${If} ${Errors}
          MessageBox MB_ICONEXCLAMATION "$(NoPermission)"
          Abort
        ${EndIf}
        Goto restart
      ${EndIf}
      ; Virtualization and the platform are on, or Windows did not say: something else stopped it,
      ; most often the download. Details hold Windows' own words.
      MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(LinuxFailed)" IDNO failed
        ExecShell "open" "${HELP_URL}#no-arranca"
      failed:
      Abort

      restart:
      WriteRegStr HKCU "${STATE_KEY}" "RestartAsked" "$1"
      ; Windows finishes it on restart. Until then «MADRE» on the desktop and in the Start menu is
      ; a copy of this installer, which picks up here; step 4 points them at MADRE.exe. Never
      ; RunOnce: writing into the next sign-in is what malware does.
      CopyFiles /SILENT "$EXEPATH" "$INSTDIR\Instalar MADRE.exe"
      CreateShortCut "$SMPROGRAMS\MADRE.lnk" "$INSTDIR\Instalar MADRE.exe"
      CreateShortCut "$DESKTOP\MADRE.lnk" "$INSTDIR\Instalar MADRE.exe"
      MessageBox MB_YESNO|MB_ICONINFORMATION "$(Restart)" IDNO later
        Reboot
      later:
      MessageBox MB_ICONINFORMATION "$(RestartLater)"
      Quit
    ${EndIf}
  ${EndIf}

  ; 3 · Inside it: the user, Node, the tools and MADRE.
  DetailPrint "$(StepInside)"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "inside-setup.sh"
  ReadEnvStr $1 "USERNAME"
  nsExec::ExecToLog '"$Wsl" -d ${DISTRO} -u root --cd "$PLUGINSDIR" -- sh ./inside-setup.sh "$1"'
  Pop $0
  ${If} $0 != 0
    ; What inside-setup.sh said, kept where the person can find it and send it.
    CreateDirectory "$INSTDIR"
    CopyFiles /SILENT "$PLUGINSDIR\madre-instalacion.log" "$INSTDIR\instalacion.log"
    MessageBox MB_ICONEXCLAMATION "$(InsideFailed)"
    Abort
  ${EndIf}
  ; wsl.conf (systemd, the default user) is read when the Linux starts again.
  nsExec::Exec '"$Wsl" --terminate ${DISTRO}'
  Pop $0

  ; 4 · The way in, and the way out.
  DetailPrint "$(StepShortcuts)"
  SetOutPath "$INSTDIR"
  File "MADRE.exe"
  File "madre.ico"
  Delete "$INSTDIR\Instalar MADRE.exe"
  WriteUninstaller "$INSTDIR\Desinstalar MADRE.exe"
  CreateShortCut "$SMPROGRAMS\MADRE.lnk" "$INSTDIR\MADRE.exe" "" "$INSTDIR\madre.ico"
  CreateShortCut "$DESKTOP\MADRE.lnk" "$INSTDIR\MADRE.exe" "" "$INSTDIR\madre.ico"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "MADRE"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Jossue Alcalá"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\madre.ico"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "URLInfoAbout" "https://madre.run"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Desinstalar MADRE.exe"'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  DeleteRegKey HKCU "${STATE_KEY}"
SectionEnd

Function un.onInit
  !insertmacro FindWsl
FunctionEnd

Section "Uninstall"
  ; MADRE first: if it is open, it closes before its files go.
  nsExec::Exec '"$Wsl" --terminate ${DISTRO}'
  Pop $0
  ; Its Linux only when the person says so: their projects may live there. No is the default.
  MessageBox MB_YESNO|MB_DEFBUTTON2|MB_ICONQUESTION "$(RemoveLinux)" IDNO keep
    nsExec::ExecToLog '"$Wsl" --unregister ${DISTRO}'
    Pop $0
  keep:
  Delete "$SMPROGRAMS\MADRE.lnk"
  Delete "$DESKTOP\MADRE.lnk"
  Delete "$INSTDIR\MADRE.exe"
  Delete "$INSTDIR\madre.ico"
  Delete "$INSTDIR\Instalar MADRE.exe"
  Delete "$INSTDIR\Desinstalar MADRE.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "${STATE_KEY}"
  DeleteRegKey /ifempty HKCU "Software\MADRE"
SectionEnd
