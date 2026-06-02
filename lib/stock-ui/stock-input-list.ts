export type StockInputRowVM = {
  rowKey: string
  sourceType: "REFERENCE" | "SHOE"
  referenceStockId: string | null
  productId: string
  productCode: string
  productName: string
  hookGroup: string
  hookNo: number | null
  hookLabel: string
  supplierCode: string
  displayCode: string
  displayName: string
  productGroup: string | null
  groupCode: string | null
  sortKey: string
}

type RawStockInputRow = {
  rowKey?: unknown
  source?: unknown
  sourceType?: unknown
  referenceStockId?: unknown
  productId?: unknown
  productCode?: unknown
  productName?: unknown
  hookGroup?: unknown
  hookNo?: unknown
  hookLabel?: unknown
  supplierCode?: unknown
  displayCode?: unknown
  displayName?: unknown
  productGroup?: unknown
  groupCode?: unknown
  sortKey?: unknown
}

function optionalString(value: unknown): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

function requiredString(value: unknown, field: string): string {
  const trimmed = String(value ?? "").trim()
  if (!trimmed) {
    throw new Error(`Invalid stock input row: missing ${field}`)
  }
  return trimmed
}

function parseHookNo(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

function parseSourceType(value: unknown): "REFERENCE" | "SHOE" {
  const raw = String(value ?? "").trim().toUpperCase()
  if (raw === "REFERENCE" || raw === "SHOE") {
    return raw
  }
  throw new Error(`Invalid stock input row: unknown source ${String(value)}`)
}

export function normalizeStockInputRow(raw: RawStockInputRow): StockInputRowVM {
  const sourceType = parseSourceType(raw.sourceType ?? raw.source)
  const productGroup = optionalString(raw.productGroup)
  const groupCode = optionalString(raw.groupCode) ?? productGroup

  return {
    rowKey: requiredString(raw.rowKey, "rowKey"),
    sourceType,
    referenceStockId: optionalString(raw.referenceStockId),
    productId: requiredString(raw.productId, "productId"),
    productCode: requiredString(raw.productCode, "productCode"),
    productName: requiredString(raw.productName, "productName"),
    hookGroup: requiredString(raw.hookGroup, "hookGroup"),
    hookNo: parseHookNo(raw.hookNo),
    hookLabel: requiredString(raw.hookLabel, "hookLabel"),
    supplierCode: String(raw.supplierCode ?? ""),
    displayCode: requiredString(raw.displayCode, "displayCode"),
    displayName: requiredString(raw.displayName, "displayName"),
    productGroup,
    groupCode,
    sortKey: requiredString(raw.sortKey, "sortKey"),
  }
}

export function normalizeStockInputList(raw: unknown): StockInputRowVM[] {
  if (!Array.isArray(raw)) {
    throw new Error("Stock input list must be an array")
  }
  return raw.map((row) => normalizeStockInputRow(row as RawStockInputRow))
}
