import type { PosKeypadActionId, PosKeypadButtonDef } from "./types"

/** 7×4 keypad grid — mirrors legacy full-pos terminal layout. */
export const POS_KEYPAD_BUTTONS: readonly PosKeypadButtonDef[] = [
  {
    id: "worktime",
    label: "WORKTIME\nIN/OUT",
    col: 1,
    row: 1,
    variant: "worktime",
    multiline: true,
  },
  {
    id: "target-vs-sales",
    label: "TARGET\nVS SALES",
    col: 1,
    row: 2,
    variant: "target",
    multiline: true,
  },
  {
    id: "collector",
    label: "COLLECTOR",
    col: 1,
    row: 3,
    variant: "collector",
  },
  {
    id: "logout",
    label: "LOGOUT",
    col: 1,
    row: 4,
    variant: "logout",
  },
  { id: "digit-7", label: "7", col: 2, row: 1, variant: "digit" },
  { id: "digit-8", label: "8", col: 3, row: 1, variant: "digit" },
  { id: "digit-9", label: "9", col: 4, row: 1, variant: "digit" },
  { id: "digit-4", label: "4", col: 2, row: 2, variant: "digit" },
  { id: "digit-5", label: "5", col: 3, row: 2, variant: "digit" },
  { id: "digit-6", label: "6", col: 4, row: 2, variant: "digit" },
  { id: "digit-1", label: "1", col: 2, row: 3, variant: "digit" },
  { id: "digit-2", label: "2", col: 3, row: 3, variant: "digit" },
  { id: "digit-3", label: "3", col: 4, row: 3, variant: "digit" },
  {
    id: "digit-0",
    label: "0",
    col: 2,
    row: 4,
    colSpan: 2,
    variant: "digit",
  },
  { id: "digit-dot", label: ".", col: 4, row: 4, variant: "digit" },
  { id: "backspace", label: "⌫", col: 5, row: 1, variant: "control" },
  { id: "clear", label: "C", col: 5, row: 2, variant: "control" },
  {
    id: "enter",
    label: "ENTER",
    col: 5,
    row: 3,
    rowSpan: 2,
    variant: "enter",
  },
  { id: "order", label: "ORDER", col: 6, row: 1, variant: "order" },
  {
    id: "stock-count",
    label: "STOCK\nCOUNT",
    col: 6,
    row: 2,
    variant: "stock-count",
    multiline: true,
  },
  {
    id: "repair-ticket",
    label: "REPAIR\nTICKET",
    col: 6,
    row: 3,
    variant: "repair",
    multiline: true,
  },
  { id: "read-x", label: "READ X", col: 7, row: 1, variant: "read-x" },
  { id: "read-z", label: "READ Z", col: 7, row: 2, variant: "read-z" },
  {
    id: "print-report",
    label: "PRINT\nREPORT",
    col: 7,
    row: 3,
    variant: "print-report",
    multiline: true,
  },
  {
    id: "checkout",
    label: "CHECKOUT",
    col: 6,
    row: 4,
    colSpan: 2,
    variant: "checkout",
  },
] as const

const REQUIRED_BUTTON_IDS: readonly PosKeypadActionId[] = [
  "worktime",
  "target-vs-sales",
  "collector",
  "logout",
  "order",
  "stock-count",
  "read-x",
  "read-z",
  "repair-ticket",
  "print-report",
  "checkout",
  "digit-0",
  "enter",
]

export function getPosKeypadButtonIds(): PosKeypadActionId[] {
  return POS_KEYPAD_BUTTONS.map((b) => b.id)
}

export function assertPosKeypadLayoutComplete(): void {
  const ids = new Set(getPosKeypadButtonIds())
  for (const id of REQUIRED_BUTTON_IDS) {
    if (!ids.has(id)) {
      throw new Error(`POS keypad layout missing button: ${id}`)
    }
  }
}
