import type { PosKeypadActionId, PosPlaceholderId } from "./types"

export type PosActionKind =
  | "wire-nav"
  | "wire-refund"
  | "wire-logout"
  | "wire-checkout"
  | "wire-target-vs-sales"
  | "wire-worktime"
  | "wire-collector"
  | "wire-repair-ticket"
  | "wire-read-x"
  | "wire-read-z"
  | "wire-print-report"
  | "placeholder"
  | "keypad"

const PLACEHOLDER_IDS: readonly PosPlaceholderId[] = []

const PLACEHOLDER_SET = new Set<string>(PLACEHOLDER_IDS)

const WIRE_NAV_IDS = new Set<string>(["stock-count"])

const WIRE_TARGET_VS_SALES_IDS = new Set<string>(["target-vs-sales"])

const WIRE_WORKTIME_IDS = new Set<string>(["worktime"])

const WIRE_REFUND_IDS = new Set<string>(["refund"])

const KEYPAD_BUFFER_IDS = new Set<string>([
  "digit-7",
  "digit-8",
  "digit-9",
  "digit-4",
  "digit-5",
  "digit-6",
  "digit-1",
  "digit-2",
  "digit-3",
  "digit-0",
  "digit-dot",
  "backspace",
  "clear",
  "enter",
])

export function getPosActionKind(id: PosKeypadActionId): PosActionKind {
  if (id === "logout") return "wire-logout"
  if (id === "checkout") return "wire-checkout"
  if (id === "collector") return "wire-collector"
  if (id === "repair-ticket") return "wire-repair-ticket"
  if (id === "read-x") return "wire-read-x"
  if (id === "read-z") return "wire-read-z"
  if (id === "print-report") return "wire-print-report"
  if (WIRE_TARGET_VS_SALES_IDS.has(id)) return "wire-target-vs-sales"
  if (WIRE_WORKTIME_IDS.has(id)) return "wire-worktime"
  if (WIRE_REFUND_IDS.has(id)) return "wire-refund"
  if (WIRE_NAV_IDS.has(id)) return "wire-nav"
  if (PLACEHOLDER_SET.has(id)) return "placeholder"
  if (KEYPAD_BUFFER_IDS.has(id)) return "keypad"
  return "keypad"
}

export function isPosPlaceholderId(id: string): id is PosPlaceholderId {
  return PLACEHOLDER_SET.has(id)
}

export function getPosPlaceholderPhaseHint(id: PosPlaceholderId): string {
  return "Not available yet"
}

export function getPosPlaceholderTitle(id: PosPlaceholderId): string {
  switch (id) {
    case "worktime":
      return "Worktime In/Out"
    case "target-vs-sales":
      return "Target vs Sales"
    case "collector":
      return "Collector"
    case "read-x":
      return "Read X"
    case "read-z":
      return "Read Z"
    case "repair-ticket":
      return "Repair Ticket"
    case "print-report":
      return "Print Report"
    default:
      return id
  }
}

/** Digit character appended to barcode buffer for keypad digit-* actions. */
export function keypadDigitChar(id: PosKeypadActionId): string | null {
  if (id === "digit-dot") return "."
  if (id === "digit-0") return "0"
  const match = /^digit-([1-9])$/.exec(id)
  return match ? match[1] : null
}

/** PRINT cell ghost when overlay blocks keypad or READ X report is open. */
export function shouldGhostPrintReportButton(opts: {
  sideMuted: boolean
  readReportMode: "X" | "Z" | "COLLECT" | null
}): boolean {
  if (opts.sideMuted) return true
  if (!opts.readReportMode) return false
  return opts.readReportMode !== "Z" && opts.readReportMode !== "COLLECT"
}

export function isPrintReportHighlighted(
  readReportMode: "X" | "Z" | "COLLECT" | null
): boolean {
  return readReportMode === "Z" || readReportMode === "COLLECT"
}
