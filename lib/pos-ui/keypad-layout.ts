import type { PosKeypadActionId, PosKeypadButtonDef } from "./types"

/** HO / session column — worktime, targets, collector, logout. */
export const POS_KEYPAD_STAFF_COLUMN = 1

/** Shop Tools column — immediately after staff column, before numeric keypad. */
export const POS_KEYPAD_SHOP_TOOLS_COLUMN = 2

/** Numeric digit block (cols 3–5); controls in col 6. */
export const POS_KEYPAD_NUMERIC_FIRST_COLUMN = 3
export const POS_KEYPAD_NUMERIC_CONTROL_COLUMN = 6

/** Document / audit column — read, refund, lookup. */
export const POS_KEYPAD_DOCUMENTS_COLUMN = 7

/**
 * Shop-tools row 1 — blank by default; staff evidence or READ Z print when active.
 */
export const POS_KEYPAD_SHOP_TOOLS_TOP_SLOT = {
  col: POS_KEYPAD_SHOP_TOOLS_COLUMN,
  row: 1,
} as const

/** @deprecated Use POS_KEYPAD_SHOP_TOOLS_TOP_SLOT */
export const POS_KEYPAD_PRINT_REPORT_SLOT = POS_KEYPAD_SHOP_TOOLS_TOP_SLOT

/** 7×5 keypad grid — staff | shop tools | numeric | documents | checkout. */
export const POS_KEYPAD_BUTTONS: readonly PosKeypadButtonDef[] = [
  {
    id: "worktime",
    label: "WORKTIME\nIN/OUT",
    col: POS_KEYPAD_STAFF_COLUMN,
    row: 1,
    variant: "worktime",
    multiline: true,
  },
  {
    id: "target-vs-sales",
    label: "TARGET\nVS SALES",
    col: POS_KEYPAD_STAFF_COLUMN,
    row: 2,
    variant: "target",
    multiline: true,
  },
  {
    id: "collector",
    label: "COLLECTOR",
    col: POS_KEYPAD_STAFF_COLUMN,
    row: 3,
    variant: "collector",
  },
  {
    id: "logout",
    label: "LOGOUT",
    col: POS_KEYPAD_STAFF_COLUMN,
    row: 4,
    variant: "logout",
  },
  { id: "digit-7", label: "7", col: 3, row: 1, variant: "digit" },
  { id: "digit-8", label: "8", col: 4, row: 1, variant: "digit" },
  { id: "digit-9", label: "9", col: 5, row: 1, variant: "digit" },
  { id: "digit-4", label: "4", col: 3, row: 2, variant: "digit" },
  { id: "digit-5", label: "5", col: 4, row: 2, variant: "digit" },
  { id: "digit-6", label: "6", col: 5, row: 2, variant: "digit" },
  { id: "digit-1", label: "1", col: 3, row: 3, variant: "digit" },
  { id: "digit-2", label: "2", col: 4, row: 3, variant: "digit" },
  { id: "digit-3", label: "3", col: 5, row: 3, variant: "digit" },
  {
    id: "digit-0",
    label: "0",
    col: 3,
    row: 4,
    colSpan: 2,
    variant: "digit",
  },
  { id: "digit-dot", label: ".", col: 5, row: 4, variant: "digit" },
  { id: "backspace", label: "⌫", col: 6, row: 1, variant: "control" },
  { id: "clear", label: "C", col: 6, row: 2, variant: "control" },
  {
    id: "enter",
    label: "ENTER",
    col: 6,
    row: 3,
    rowSpan: 2,
    variant: "enter",
  },
  {
    id: "staff-evidence",
    label: "ทำประวัติ\nพนักงาน",
    col: POS_KEYPAD_SHOP_TOOLS_TOP_SLOT.col,
    row: POS_KEYPAD_SHOP_TOOLS_TOP_SLOT.row,
    variant: "staff-evidence",
    multiline: true,
  },
  {
    id: "print-report",
    label: "PRINT\nREPORT",
    col: POS_KEYPAD_SHOP_TOOLS_TOP_SLOT.col,
    row: POS_KEYPAD_SHOP_TOOLS_TOP_SLOT.row,
    variant: "print-report",
    multiline: true,
  },
  {
    id: "order",
    label: "ORDER",
    col: POS_KEYPAD_SHOP_TOOLS_COLUMN,
    row: 2,
    variant: "order",
  },
  {
    id: "stock-count",
    label: "STOCK\nCOUNT",
    col: POS_KEYPAD_SHOP_TOOLS_COLUMN,
    row: 3,
    variant: "stock-count",
    multiline: true,
  },
  {
    id: "repair-ticket",
    label: "REPAIR\nTICKET",
    col: POS_KEYPAD_SHOP_TOOLS_COLUMN,
    row: 4,
    variant: "repair",
    multiline: true,
  },
  {
    id: "read-x",
    label: "READ X",
    col: POS_KEYPAD_DOCUMENTS_COLUMN,
    row: 1,
    variant: "read-x",
  },
  {
    id: "read-z",
    label: "READ Z",
    col: POS_KEYPAD_DOCUMENTS_COLUMN,
    row: 2,
    variant: "read-z",
  },
  {
    id: "refund",
    label: "REFUND",
    col: POS_KEYPAD_DOCUMENTS_COLUMN,
    row: 3,
    variant: "refund",
  },
  {
    id: "receipt-lookup",
    label: "LOOKUP",
    col: POS_KEYPAD_DOCUMENTS_COLUMN,
    row: 4,
    variant: "lookup",
  },
  {
    id: "checkout",
    label: "CHECKOUT",
    col: POS_KEYPAD_NUMERIC_CONTROL_COLUMN,
    row: 5,
    colSpan: 2,
    variant: "checkout",
  },
] as const

/** Non-action cells that keep the 7×5 grid visually balanced. */
export type PosKeypadPlaceholderCell = {
  col: number
  row: number
  colSpan?: number
  rowSpan?: number
}

export const POS_KEYPAD_PLACEHOLDER_CELLS: readonly PosKeypadPlaceholderCell[] = [
  { col: POS_KEYPAD_SHOP_TOOLS_COLUMN, row: 1 },
]

/** Reserved bottom-left slot for POS warnings (cols 1–5, row 5). */
export const POS_KEYPAD_MESSAGE_SLOT = {
  col: 1,
  row: 5,
  colSpan: 5,
} as const

export const POS_KEYPAD_ROW_COUNT = 5
export const POS_KEYPAD_COL_COUNT = 7

const REQUIRED_BUTTON_IDS: readonly PosKeypadActionId[] = [
  "worktime",
  "target-vs-sales",
  "collector",
  "logout",
  "refund",
  "receipt-lookup",
  "order",
  "stock-count",
  "read-x",
  "read-z",
  "staff-evidence",
  "repair-ticket",
  "print-report",
  "checkout",
  "digit-0",
  "enter",
]

const SHOP_TOOLS_TOP_SLOT_IDS = new Set<PosKeypadActionId>([
  "staff-evidence",
  "print-report",
])

export function isPosKeypadShopToolsTopSlotButton(id: PosKeypadActionId): boolean {
  return SHOP_TOOLS_TOP_SLOT_IDS.has(id)
}

export function isPosKeypadPrintReportSlotButton(id: PosKeypadActionId): boolean {
  return id === "print-report"
}

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

export function getPosKeypadButtonPlacement(
  id: PosKeypadActionId
): PosKeypadButtonDef | undefined {
  return POS_KEYPAD_BUTTONS.find((button) => button.id === id)
}

/** Digit / control / enter cells in the numeric keypad block (cols 3–6). */
export function isPosKeypadNumericButton(def: PosKeypadButtonDef): boolean {
  return (
    def.variant === "digit" ||
    def.variant === "control" ||
    def.variant === "enter"
  )
}

/** @deprecated Use POS_KEYPAD_SHOP_TOOLS_TOP_SLOT */
export const POS_KEYPAD_RESERVED_PRIMARY_SLOT = POS_KEYPAD_SHOP_TOOLS_TOP_SLOT

/** @deprecated Use isPosKeypadShopToolsTopSlotButton */
export function isPosKeypadReservedPrimarySlotButton(id: PosKeypadActionId): boolean {
  return isPosKeypadShopToolsTopSlotButton(id)
}
