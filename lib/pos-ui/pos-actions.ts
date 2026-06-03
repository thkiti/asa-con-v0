import type { PosKeypadActionId, PosPlaceholderId } from "./types"

export type PosActionKind = "wire-nav" | "wire-logout" | "placeholder" | "keypad"

const PLACEHOLDER_IDS: readonly PosPlaceholderId[] = [
  "worktime",
  "target-vs-sales",
  "collector",
  "read-x",
  "read-z",
  "repair-ticket",
  "print-report",
  "checkout",
]

const PLACEHOLDER_SET = new Set<string>(PLACEHOLDER_IDS)

const WIRE_NAV_IDS = new Set<string>(["order", "stock-count"])

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
  if (WIRE_NAV_IDS.has(id)) return "wire-nav"
  if (PLACEHOLDER_SET.has(id)) return "placeholder"
  if (KEYPAD_BUFFER_IDS.has(id)) return "keypad"
  return "keypad"
}

export function isPosPlaceholderId(id: string): id is PosPlaceholderId {
  return PLACEHOLDER_SET.has(id)
}

export function getPosPlaceholderPhaseHint(id: PosPlaceholderId): string {
  switch (id) {
    case "checkout":
      return "Phase 3 — checkout, receipt, and stock posting"
    case "worktime":
    case "target-vs-sales":
    case "collector":
    case "read-x":
    case "read-z":
    case "print-report":
    case "repair-ticket":
      return "Coming in a later POS phase — APIs not yet available in v0"
    default:
      return "Not available yet"
  }
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
    case "checkout":
      return "Checkout"
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
