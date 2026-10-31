; SPDX-License-Identifier: BUSL-1.1
; MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
;
; MADRE.exe, what the Start menu and the desktop open (madre.nsi). It starts MADRE inside its own
; Linux with no window, and MADRE opens itself in Windows' browser (wslview, src/environment.mjs).
; Opened while MADRE is already running, MADRE finds itself and only opens the page again
; (bin/madre.mjs, roomAlreadyOpen). Turning it off is Turn MADRE off, inside MADRE.

Unicode true
SetCompress off
SilentInstall silent
RequestExecutionLevel user
OutFile "MADRE.exe"
Icon "madre.ico"
Name "MADRE"
VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=0 "ProductName" "MADRE"
VIAddVersionKey /LANG=0 "CompanyName" "Jossue Alcalá"
VIAddVersionKey /LANG=0 "FileDescription" "MADRE"
VIAddVersionKey /LANG=0 "FileVersion" "1.0.0"
VIAddVersionKey /LANG=0 "ProductVersion" "1.0.0"
VIAddVersionKey /LANG=0 "OriginalFilename" "MADRE.exe"
VIAddVersionKey /LANG=0 "LegalCopyright" "© 2026 Jossue Alcalá"

!include "LogicLib.nsh"

Section
  ${If} ${FileExists} "$WINDIR\Sysnative\wsl.exe"
    StrCpy $0 "$WINDIR\Sysnative\wsl.exe"
  ${Else}
    StrCpy $0 "$SYSDIR\wsl.exe"
  ${EndIf}
  ; A login shell, so ~/.local/bin (where MADRE lives, inside-setup.sh) is on the PATH.
  ExecShell "open" "$0" '-d MADRE --cd ~ -- bash -lc "exec madre"' SW_HIDE
SectionEnd
