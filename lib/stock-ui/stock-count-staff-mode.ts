import type { StockDocumentActionId, StockDocumentActionVM } from "./types"

/** Query param value when entering the editor from FULL POS → STOCK COUNT. */
export const STOCK_COUNT_STAFF_FROM = "shop"

export const STOCK_COUNT_STAFF_BACK_HREF = "/shop"

const STAFF_TOOLBAR_ACTION_IDS: ReadonlySet<StockDocumentActionId> = new Set([
  "save",
  "submit",
])

export function isStockCountStaffEntry(from: string | null | undefined): boolean {
  return String(from ?? "").trim() === STOCK_COUNT_STAFF_FROM
}

export function filterEditorActionsForStockCountStaff(
  actions: StockDocumentActionVM[]
): StockDocumentActionVM[] {
  return actions.filter((action) => STAFF_TOOLBAR_ACTION_IDS.has(action.id))
}

/** Display date as YYYY.MM.DD for the staff counting sheet heading. */
export function formatStockCountStaffDate(date: string): string {
  const trimmed = String(date ?? "").trim()
  if (!trimmed) return ""

  const isoDate = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return trimmed

  return `${year}.${month}.${day}`
}
