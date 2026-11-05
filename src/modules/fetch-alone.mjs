// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Loaded before an external one-file MCP server. Its fetch calls still appear in the same
// outbound log as a built-in server's; the permission model only lets it write that log file.
import { OutboundLog } from '../outbound.mjs';

if (process.env.PULSE_OUTBOUND_LOG) new OutboundLog({ file: process.env.PULSE_OUTBOUND_LOG }).install();
