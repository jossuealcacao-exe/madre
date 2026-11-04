# SPDX-License-Identifier: BUSL-1.1
# MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
#
# Why MADRE's Linux does not start, asked of Windows itself (installer 1.0.2, WIN-033). The
# installer runs it when WSL is there but the Linux will not answer, so it never again blames the
# BIOS for what is a Windows feature or a restart (reports MR-H7C2WH, MR-SJVN7H, MR-NAVWHM). No
# administrator needed: these are reads.
#
#   exit 0  virtualization on and the Virtual Machine Platform on: something else stopped it
#   exit 1  virtualization off (the BIOS/UEFI, or a virtual machine without nested virtualization)
#   exit 2  virtualization on, the Virtual Machine Platform off: Windows can turn it on
#   other   Windows did not say
#
# A running hypervisor hides the firmware flag (VirtualizationFirmwareEnabled reads False under
# Hyper-V), so HypervisorPresent counts as on.

$ErrorActionPreference = 'Stop'
try {
  $computer = Get-CimInstance -ClassName Win32_ComputerSystem
  $processor = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
  if (-not ($computer.HypervisorPresent -or $processor.VirtualizationFirmwareEnabled)) { exit 1 }
  $platform = Get-CimInstance -ClassName Win32_OptionalFeature -Filter "Name='VirtualMachinePlatform'"
  # InstallState: 1 enabled, 2 disabled, 3 absent.
  if ($platform -and $platform.InstallState -ne 1) { exit 2 }
  exit 0
} catch {
  exit 9
}
