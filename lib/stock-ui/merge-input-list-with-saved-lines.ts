import type { StockInputRowVM } from "./stock-input-list"

export type SavedLineOverlay = {
  productId: string
  qty: number
  endingQty?: number | null
  reviewPostingDelta?: number | null
}

export type MergedCountingRowVM = StockInputRowVM & {
  qty: string
  endingQty: string
  reviewPostingDelta: string
  isOrphan: boolean
}

export type MergeInputListResult = {
  rows: MergedCountingRowVM[]
  orphans: MergedCountingRowVM[]
}

function formatQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ""
  return String(Math.trunc(value))
}

function buildSavedLineMap(savedLines: SavedLineOverlay[]): Map<string, SavedLineOverlay> {
  const map = new Map<string, SavedLineOverlay>()
  for (const line of savedLines) {
    const productId = String(line.productId ?? "").trim()
    if (!productId) continue
    map.set(productId, line)
  }
  return map
}

function overlaySavedFields(
  inputRow: StockInputRowVM,
  saved: SavedLineOverlay | undefined,
  isOrphan: boolean
): MergedCountingRowVM {
  return {
    ...inputRow,
    qty: saved ? formatQty(saved.qty) : "",
    endingQty: saved ? formatQty(saved.endingQty ?? null) : "",
    reviewPostingDelta: saved ? formatQty(saved.reviewPostingDelta ?? null) : "",
    isOrphan,
  }
}

export function mergeInputListWithSavedLines(
  inputRows: StockInputRowVM[],
  savedLines: SavedLineOverlay[]
): MergeInputListResult {
  const savedByProductId = buildSavedLineMap(savedLines)
  const masterProductIds = new Set(inputRows.map((row) => row.productId))

  const rows = inputRows.map((inputRow) =>
    overlaySavedFields(inputRow, savedByProductId.get(inputRow.productId), false)
  )

  const orphans: MergedCountingRowVM[] = []
  for (const saved of savedByProductId.values()) {
    if (masterProductIds.has(saved.productId)) continue

    orphans.push(
      overlaySavedFields(
        {
          rowKey: `orphan-${saved.productId}`,
          sourceType: "REFERENCE",
          referenceStockId: null,
          productId: saved.productId,
          productCode: saved.productId,
          productName: saved.productId,
          hookGroup: "O",
          hookNo: null,
          hookLabel: "orphan",
          supplierCode: "",
          displayCode: saved.productId,
          displayName: saved.productId,
          productGroup: null,
          groupCode: null,
          sortKey: `orphan|${saved.productId}`,
        },
        saved,
        true
      )
    )
  }

  return { rows, orphans }
}
