import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import type { RefundLookupRow } from "@/lib/pos/refund-lookup-types"
import { fetchReceiptLookup } from "@/lib/pos-ui/receipt-lookup-client"
import { fetchRefundLookup } from "@/lib/pos-ui/refund-lookup-client"
import {
  resolvePosRecRefLookupDateRange,
  type PosRecRefLookupDocType,
  type PosRecRefLookupFilter,
} from "@/lib/pos-ui/pos-rec-ref-lookup-filter"

export type PosRecRefLookupRow = {
  id: string
  documentNo: string
  issuedAt: string
  branchCode: string
  branchName: string
  docType: "REC" | "REF"
  statusLabel: string
  pdfAvailable: boolean | null
  receipt?: ReceiptLookupRow
  refund?: RefundLookupRow
}

export type PosRecRefLookupSearchResult =
  | { ok: true; rows: PosRecRefLookupRow[] }
  | { ok: false; error: string }

function mapReceiptRow(row: ReceiptLookupRow): PosRecRefLookupRow {
  return {
    id: row.receiptId,
    documentNo: row.receiptNo,
    issuedAt: row.issuedAt,
    branchCode: row.branchCode,
    branchName: row.branchName,
    docType: "REC",
    statusLabel: row.archiveStatusLabel,
    pdfAvailable:
      row.archiveStatus === "ready"
        ? true
        : row.archiveStatus === "legacy"
          ? null
          : false,
    receipt: row,
  }
}

function mapRefundRow(row: RefundLookupRow): PosRecRefLookupRow {
  return {
    id: row.refundId,
    documentNo: row.refundNo,
    issuedAt: row.issuedAt,
    branchCode: row.branchCode,
    branchName: row.branchName,
    docType: "REF",
    statusLabel: row.archiveStatusLabel,
    pdfAvailable:
      row.archiveStatus === "ready"
        ? true
        : row.archiveStatus === "legacy"
          ? null
          : false,
    refund: row,
  }
}

function shouldFetchDocType(
  docType: PosRecRefLookupDocType | undefined,
  target: "REC" | "REF"
): boolean {
  if (!docType) return true
  return docType === target
}

export async function searchPosRecRefLookup(
  branchId: string,
  filter: PosRecRefLookupFilter
): Promise<PosRecRefLookupSearchResult> {
  const trimmedBranchId = branchId.trim()
  if (!trimmedBranchId) {
    return { ok: false, error: "Branch is required" }
  }

  const { dateFrom, dateTo } = resolvePosRecRefLookupDateRange(filter)
  const documentNo = filter.documentNo?.trim() ?? ""
  const docType = filter.docType

  const rows: PosRecRefLookupRow[] = []

  if (shouldFetchDocType(docType, "REC")) {
    const response = await fetchReceiptLookup({
      branchId: trimmedBranchId,
      receiptNo: documentNo || undefined,
      dateFrom,
      dateTo,
    })
    if (!response.ok) {
      return { ok: false, error: response.error }
    }
    rows.push(...response.result.receipts.map(mapReceiptRow))
  }

  if (shouldFetchDocType(docType, "REF")) {
    const response = await fetchRefundLookup({
      branchId: trimmedBranchId,
      refundNo: documentNo || undefined,
      dateFrom,
      dateTo,
    })
    if (!response.ok) {
      return { ok: false, error: response.error }
    }
    rows.push(...response.result.refunds.map(mapRefundRow))
  }

  rows.sort(
    (left, right) =>
      new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime()
  )

  return { ok: true, rows }
}
