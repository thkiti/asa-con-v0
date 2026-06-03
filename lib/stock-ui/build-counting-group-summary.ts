export const COUNTING_GROUP_SUMMARY_UNGROUPED_LABEL = "(ไม่ระบุกลุ่ม)"
export const STOCK_DOCUMENT_GROUP_SUMMARY_TOTAL_LABEL = "TOTAL"

export type StockDocumentGroupSummaryTotals = {
  items: number
  totalQty: number
}

export type StockDocumentGroupSummaryRow = {
  productGroup: string
  name: string
  items: number
  totalQty: number
}

/** @deprecated Use StockDocumentGroupSummaryRow */
export type CountingGroupSummaryRow = StockDocumentGroupSummaryRow

export type StockDocumentGroupSummaryLine = {
  productGroup?: string | null
  productName?: string | null
  qty: string
}

/** @deprecated Use StockDocumentGroupSummaryLine */
export type CountingGroupSummaryLine = StockDocumentGroupSummaryLine

function groupKey(productGroup: string | null | undefined): string {
  const trimmed = String(productGroup ?? "").trim()
  return trimmed.length > 0 ? trimmed : COUNTING_GROUP_SUMMARY_UNGROUPED_LABEL
}

/** Line has a counted qty: non-empty and not zero (negative counts for adjustment). */
export function hasCountedQty(qty: string | null | undefined): boolean {
  const trimmed = String(qty ?? "").trim()
  if (trimmed === "") return false
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return false
  return n !== 0
}

function parseQty(qty: string): number {
  const n = Number(String(qty ?? "").trim())
  return Number.isFinite(n) ? n : 0
}

function resolveGroupDisplayName(lines: StockDocumentGroupSummaryLine[]): string {
  for (const line of lines) {
    const name = String(line.productName ?? "").trim()
    if (name) return name
  }
  return "—"
}

/**
 * Display-only group summary from on-screen counting rows.
 * items / totalQty include only lines with counted qty (not blank or zero).
 */
export function buildStockDocumentGroupSummary(
  lines: StockDocumentGroupSummaryLine[]
): StockDocumentGroupSummaryRow[] {
  const buckets = new Map<
    string,
    { lines: StockDocumentGroupSummaryLine[]; items: number; totalQty: number }
  >()

  for (const line of lines) {
    const key = groupKey(line.productGroup)
    const bucket = buckets.get(key) ?? { lines: [], items: 0, totalQty: 0 }
    bucket.lines.push(line)
    if (hasCountedQty(line.qty)) {
      bucket.items += 1
      bucket.totalQty += parseQty(line.qty)
    }
    buckets.set(key, bucket)
  }

  return [...buckets.entries()]
    .map(([productGroup, bucket]) => ({
      productGroup,
      name: resolveGroupDisplayName(bucket.lines),
      items: bucket.items,
      totalQty: bucket.totalQty,
    }))
    .sort((a, b) => a.productGroup.localeCompare(b.productGroup))
}

/** Sum items and qty from displayed group rows (items > 0 only). */
export function sumStockDocumentGroupSummaryRows(
  rows: StockDocumentGroupSummaryRow[]
): StockDocumentGroupSummaryTotals {
  return rows
    .filter((row) => row.items > 0)
    .reduce(
      (acc, row) => ({
        items: acc.items + row.items,
        totalQty: acc.totalQty + row.totalQty,
      }),
      { items: 0, totalQty: 0 }
    )
}

/** @deprecated Use buildStockDocumentGroupSummary */
export const buildCountingGroupSummary = buildStockDocumentGroupSummary
