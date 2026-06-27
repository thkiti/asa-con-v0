import { POS_KEYPAD_BUTTONS } from "./keypad-layout"
import type { PosKeypadActionId } from "./types"
import type { ReadReportMode } from "@/lib/pos/read-report-types"

export type PosActiveWorkspaceKind =
  | "lookup"
  | "refund"
  | "read-x"
  | "read-z"
  | "read-z-lookup"
  | "collector"
  | "repair-ticket"

export type PosActiveWorkspace = {
  kind: PosActiveWorkspaceKind
  activeButtonId: PosKeypadActionId
}

export type PosWorkspaceKeypadState = {
  receiptLookupOpen?: boolean
  refundOpen?: boolean
  refundSlipOpen?: boolean
  readStaffGate?: "X" | "Z" | null
  readReportMode?: ReadReportMode | null
  readZLookupOpen?: boolean
  collectorOpen?: boolean
  repairTicketOpen?: boolean
}

/** Document / shop workspace flows — one open at a time on the orange panel. */
export function resolvePosActiveWorkspace(
  state: PosWorkspaceKeypadState
): PosActiveWorkspace | null {
  if (state.receiptLookupOpen) {
    return { kind: "lookup", activeButtonId: "receipt-lookup" }
  }
  if (state.refundSlipOpen || state.refundOpen) {
    return { kind: "refund", activeButtonId: "refund" }
  }
  if (state.readStaffGate === "X" || state.readReportMode === "X") {
    return { kind: "read-x", activeButtonId: "read-x" }
  }
  if (state.readZLookupOpen) {
    return { kind: "read-z-lookup", activeButtonId: "read-z-lookup" }
  }
  if (state.readStaffGate === "Z" || state.readReportMode === "Z") {
    return { kind: "read-z", activeButtonId: "read-z" }
  }
  if (state.collectorOpen || state.readReportMode === "COLLECT") {
    return { kind: "collector", activeButtonId: "collector" }
  }
  if (state.repairTicketOpen) {
    return { kind: "repair-ticket", activeButtonId: "repair-ticket" }
  }
  return null
}

/** HO/session buttons that stay visible while a document workspace is open. */
const WORKSPACE_KEYPAD_KEEP_VISIBLE: readonly PosKeypadActionId[] = []

/** Ghost every keypad cell except the active workspace opener and HO externals. */
export function buildPosWorkspaceKeypadGhostButtonIds(
  workspace: PosActiveWorkspace | null,
  _opts?: { readReportMode?: ReadReportMode | null }
): ReadonlySet<PosKeypadActionId> {
  if (!workspace) {
    return new Set()
  }

  const keep = new Set<PosKeypadActionId>([
    workspace.activeButtonId,
    ...WORKSPACE_KEYPAD_KEEP_VISIBLE,
  ])

  const ids = new Set<PosKeypadActionId>()
  for (const btn of POS_KEYPAD_BUTTONS) {
    if (!keep.has(btn.id)) {
      ids.add(btn.id)
    }
  }
  return ids
}

/** Blank numeric tiles while a workspace locks POS keypad input. */
export function shouldBlankNumericKeypadForWorkspace(
  workspace: PosActiveWorkspace | null
): boolean {
  return workspace !== null
}

export function isPosWorkspaceKeypadActionAllowed(
  workspace: PosActiveWorkspace | null,
  id: PosKeypadActionId,
  _opts?: { readReportMode?: ReadReportMode | null }
): boolean {
  if (!workspace) {
    return true
  }
  if (id === workspace.activeButtonId) {
    return true
  }
  if (WORKSPACE_KEYPAD_KEEP_VISIBLE.includes(id)) {
    return true
  }
  return false
}
