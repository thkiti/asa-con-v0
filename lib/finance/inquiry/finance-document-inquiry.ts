import type { PrismaClient } from "@/generated/prisma/client"
import type {
  FinanceDocumentInquiryFilter,
  FinanceDocumentInquiryResult,
  FinanceDocumentInquiryRow,
} from "./finance-document-inquiry-types"
import { resolvePostedVoucherInquiryPath, resolvePostedVoucherPrintPath } from "./finance-document-inquiry-links"
import { listUnpostedOperationalDocuments } from "./unposted-operational-inquiry"
import { listFinanceVouchers } from "./voucher-list"
import type { FinanceVoucherListFilter, FinanceVoucherListRow } from "./voucher-list-types"

export type {
  FinanceDocumentInquiryFilter,
  FinanceDocumentInquiryPostingState,
  FinanceDocumentInquiryPdfState,
  FinanceDocumentInquiryResult,
  FinanceDocumentInquiryRow,
} from "./finance-document-inquiry-types"

export type FinanceDocumentInquiryPrisma = Pick<
  PrismaClient,
  | "voucher"
  | "accountingPeriod"
  | "receipt"
  | "manualJournalEntry"
  | "paymentVoucher"
  | "revenueVoucher"
  | "pettyCashVoucher"
  | "documentArchiveLink"
>

function mapPostedVoucherRow(row: FinanceVoucherListRow): FinanceDocumentInquiryRow {
  return {
    id: row.id,
    rowKind: "posted",
    legalEntityCode: row.legalEntityCode,
    documentTypeCode: row.documentTypeCode,
    documentNo: row.documentNo,
    voucherNo: row.voucherNo,
    date: row.date,
    periodKey: row.periodKey,
    branchId: row.branchId,
    branchCode: row.branchCode,
    branchName: row.branchName,
    status: row.status,
    amount: row.amount,
    journalEntryId: row.journalEntryId,
    operationalDocumentId: row.refId,
    pdfAvailable: row.pdfAvailable,
    inquiryPath: resolvePostedVoucherInquiryPath({
      voucherId: row.id,
      refType: row.refType,
      refId: row.refId,
      branchId: row.branchId,
    }),
    printPath: resolvePostedVoucherPrintPath({
      refType: row.refType,
      refId: row.refId,
      branchId: row.branchId,
    }),
  }
}

function mergeDocumentRows(
  posted: FinanceDocumentInquiryRow[],
  unposted: FinanceDocumentInquiryRow[]
): FinanceDocumentInquiryRow[] {
  return [...posted, ...unposted].sort((a, b) => b.date.localeCompare(a.date))
}

export async function listFinanceDocuments(
  prisma: FinanceDocumentInquiryPrisma,
  filter: FinanceDocumentInquiryFilter
): Promise<FinanceDocumentInquiryResult> {
  const voucherFilter: FinanceVoucherListFilter = filter
  const postingState = filter.postingState ?? "all"

  const [voucherResult, unpostedResult] = await Promise.all([
    postingState === "unposted"
      ? Promise.resolve({ vouchers: [], total: 0 })
      : listFinanceVouchers(prisma, voucherFilter),
    postingState === "posted"
      ? Promise.resolve({ documents: [], total: 0 })
      : listUnpostedOperationalDocuments(prisma, filter),
  ])

  const postedRows = voucherResult.vouchers.map(mapPostedVoucherRow)
  const documents = mergeDocumentRows(postedRows, unpostedResult.documents)

  const limit = Math.min(Math.max(Number(filter.limit ?? 50) || 50, 1), 200)
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)

  if (postingState === "all") {
    const total = voucherResult.total + unpostedResult.total
    return {
      documents: documents.slice(offset, offset + limit),
      total,
    }
  }

  if (postingState === "posted") {
    return {
      documents: postedRows,
      total: voucherResult.total,
    }
  }

  return {
    documents: unpostedResult.documents,
    total: unpostedResult.total,
  }
}

/** Backward-compatible voucher list export — delegates to document inquiry posted rows only. */
export async function listFinanceVouchersAsDocuments(
  prisma: FinanceDocumentInquiryPrisma,
  filter: FinanceVoucherListFilter
): Promise<FinanceDocumentInquiryResult> {
  const result = await listFinanceVouchers(prisma, {
    ...filter,
    postingState: filter.postingState ?? "posted",
  })
  return {
    documents: result.vouchers.map(mapPostedVoucherRow),
    total: result.total,
  }
}
