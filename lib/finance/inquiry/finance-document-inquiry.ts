import type { PrismaClient } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import type {
  FinanceDocumentInquiryFilter,
  FinanceDocumentInquiryResult,
  FinanceDocumentInquiryRow,
} from "./finance-document-inquiry-types"
import { resolvePostedVoucherInquiryPath, resolvePostedVoucherPrintPath } from "./finance-document-inquiry-links"
import { listUnpostedOperationalDocuments } from "./unposted-operational-inquiry"
import {
  hasFinanceDocumentInquiryBranch,
  hasFinanceDocumentInquiryDocType,
  isFinanceDocumentInquiryRecDocType,
} from "./voucher-document-types"
import { listFinanceVouchers } from "./voucher-list"
import type { FinanceVoucherListFilter, FinanceVoucherListRow } from "./voucher-list-types"
import { FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE } from "@/lib/finance-ui/finance-document-inquiry-paging"

export { FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE }

export function assertFinanceDocumentInquiryDocTypeRequired(
  filter: Pick<FinanceDocumentInquiryFilter, "refType">
): void {
  if (hasFinanceDocumentInquiryDocType(filter.refType)) {
    return
  }
  throw new FinancePostingError(
    "Doc Type is required",
    "VALIDATION_ERROR"
  )
}

export function assertFinanceDocumentInquiryRecBranchRequired(
  filter: Pick<FinanceDocumentInquiryFilter, "refType" | "branchId">
): void {
  if (!isFinanceDocumentInquiryRecDocType(filter.refType)) {
    return
  }
  if (hasFinanceDocumentInquiryBranch(filter.branchId)) {
    return
  }
  throw new FinancePostingError(
    "REC inquiry requires a specific Shop",
    "VALIDATION_ERROR"
  )
}

export function resolveFinanceDocumentInquiryPageSize(
  limit: number | undefined
): number {
  return Math.min(
    Math.max(
      Number(limit ?? FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE) ||
        FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE,
      1
    ),
    200
  )
}

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
    archiveAvailable: row.archiveAvailable ?? null,
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
  assertFinanceDocumentInquiryDocTypeRequired(filter)
  assertFinanceDocumentInquiryRecBranchRequired(filter)

  const limit = resolveFinanceDocumentInquiryPageSize(filter.limit)
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)
  const pagedFilter: FinanceDocumentInquiryFilter = {
    ...filter,
    limit,
    offset,
  }
  const voucherFilter: FinanceVoucherListFilter = pagedFilter
  const postingState = filter.postingState ?? "all"

  const [voucherResult, unpostedResult] = await Promise.all([
    postingState === "unposted"
      ? Promise.resolve({ vouchers: [], total: 0 })
      : listFinanceVouchers(prisma, voucherFilter),
    postingState === "posted"
      ? Promise.resolve({ documents: [], total: 0 })
      : listUnpostedOperationalDocuments(prisma, pagedFilter),
  ])

  const postedRows = voucherResult.vouchers.map(mapPostedVoucherRow)

  if (postingState === "posted") {
    return {
      documents: postedRows,
      total: voucherResult.total,
    }
  }

  if (postingState === "unposted") {
    return {
      documents: unpostedResult.documents,
      total: unpostedResult.total,
    }
  }

  // postingState === "all": children already applied limit/offset.
  // When one side is empty (typical for REC), return that page as-is.
  if (unpostedResult.total === 0) {
    return {
      documents: postedRows,
      total: voucherResult.total,
    }
  }
  if (voucherResult.total === 0) {
    return {
      documents: unpostedResult.documents,
      total: unpostedResult.total,
    }
  }

  // Mixed posted + unposted: merge then slice for this page.
  const documents = mergeDocumentRows(postedRows, unpostedResult.documents)
  const total = voucherResult.total + unpostedResult.total
  return {
    documents: documents.slice(0, limit),
    total,
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
