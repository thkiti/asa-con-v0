import type { DocType } from "@/generated/prisma/client"
import type { StockMoveItem } from "./transaction-types"
import type { MappedLedgerMoves, StockDocumentWithLines } from "./posting-types"

export function resolveLedgerBranchId(doc: StockDocumentWithLines): string {
  switch (doc.docType) {
    case "TRANSFER_OUT":
    case "PERFORMANCE":
      return String(doc.fromLocId ?? "")
    case "TRANSFER_IN":
    case "PURCHASE":
      return String(doc.toLocId ?? "")
    case "ADJUSTMENT":
      return String(doc.fromLocId ?? doc.toLocId ?? doc.branchId ?? "")
    default:
      return ""
  }
}

export function ledgerRefType(docType: DocType): string {
  return `STOCK_DOC_${docType}`
}

/** Map document lines to inbound/outbound ledger batches — positive magnitudes only. */
export function mapDocumentToLedgerMoves(
  doc: StockDocumentWithLines
): MappedLedgerMoves {
  const branchId = resolveLedgerBranchId(doc)
  const refType = ledgerRefType(doc.docType)
  const inbound: StockMoveItem[] = []
  const outbound: StockMoveItem[] = []

  if (doc.docType === "ADJUSTMENT") {
    mapAdjustmentLines(doc, inbound, outbound)
  } else if (doc.docType === "TRANSFER_OUT" || doc.docType === "PERFORMANCE") {
    mapOutboundLines(doc, outbound)
  } else if (doc.docType === "TRANSFER_IN" || doc.docType === "PURCHASE") {
    mapInboundLines(doc, inbound)
  }

  return { branchId, refType, inbound, outbound }
}

function mapAdjustmentLines(
  doc: StockDocumentWithLines,
  inbound: StockMoveItem[],
  outbound: StockMoveItem[]
) {
  for (const line of doc.lines) {
    const delta = Math.trunc(Number(line.reviewPostingDelta ?? 0))
    if (delta === 0) continue
    const item: StockMoveItem = {
      productId: line.productId,
      qty: Math.abs(delta),
      lineId: line.id,
    }
    if (delta > 0) inbound.push(item)
    else outbound.push(item)
  }
}

function mapOutboundLines(
  doc: StockDocumentWithLines,
  outbound: StockMoveItem[]
) {
  for (const line of doc.lines) {
    const qty = Math.abs(Math.trunc(line.qty))
    if (qty === 0) continue
    outbound.push({
      productId: line.productId,
      qty,
      lineId: line.id,
    })
  }
}

function mapInboundLines(
  doc: StockDocumentWithLines,
  inbound: StockMoveItem[]
) {
  for (const line of doc.lines) {
    const qty = Math.abs(Math.trunc(line.qty))
    if (qty === 0) continue
    inbound.push({
      productId: line.productId,
      qty,
      lineId: line.id,
    })
  }
}