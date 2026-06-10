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

export type StockCountStaffHeadingFields = {
  refNo: string | null
  branchCode: string
  branchName: string
  staffCode: string
  staffName: string
  documentDate: string
}

/** One-line staff counting sheet title with branch, staff, and date metadata. */
export function buildStockCountStaffHeadingLine({
  refNo,
  branchCode,
  branchName,
  staffCode,
  staffName,
  documentDate,
}: StockCountStaffHeadingFields): string {
  const refLabel = refNo?.trim() || "—"
  const formattedDate = formatStockCountStaffDate(documentDate)

  return `ตรวจนับสต๊อก — ${refLabel} | ${branchCode} • ${branchName} | ${staffCode} • ${staffName} | ${formattedDate}`
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
