import {
  computeManualJournalLineTotals,
  formatManualJournalEntryDocumentNo,
  type ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import {
  formatFinanceDocumentDate,
  formatFinanceDocumentTypeTitle,
} from "@/lib/finance-ui/finance-document-display"
import { formatDateTime } from "@/lib/finance-ui/format"
import { formatEntityShort } from "@/lib/legal-entity/display"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { PaymentVoucherRead } from "@/lib/finance/payment-voucher/payment-voucher-read-types"
import {
  formatPayFromAccountLabel,
  formatPaymentVoucherDocumentNo,
  PAYMENT_VOUCHER_DOCUMENT_CODE,
  PAYMENT_VOUCHER_TYPE_TITLE,
} from "@/lib/finance-ui/payment-voucher-display"

export type FinanceVoucherPrintLine = {
  lineNo: number
  accountCode: string
  accountName: string
  lineDescription: string | null
  debit: string
  credit: string
}

export type FinanceVoucherPrintModel = {
  documentTypeCode: string
  documentTypeTitle: string
  documentNo: string
  documentDate: string
  legalEntityLabel: string
  branchLabel: string
  status: string
  reference: string | null
  description: string | null
  remarks: string | null
  lines: FinanceVoucherPrintLine[]
  totalDebit: string
  totalCredit: string
  preparedBy: string | null
  checkedBy: string | null
  approvedBy: string | null
  postedBy: string | null
  postedAt: string | null
  postedAtDisplay: string | null
  evidenceRef: string | null
  attachmentRef: string | null
  accountingVoucherId: string | null
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  /** PAV-only compact context fields — optional for MJV. */
  payeeName?: string | null
  payFromLabel?: string | null
  chequeNo?: string | null
}

function documentTypeCodeFromEntryNo(entryNo: string, entryType: ManualJournalEntryTypeCode): string {
  const prefix = entryNo.trim().split("-")[0]?.toUpperCase()
  if (prefix) return prefix
  if (entryType === "OPENING_BALANCE") return "OPB"
  if (entryType === "MANUAL") return "MJV"
  return entryType.slice(0, 3).toUpperCase()
}

/** Build browser-print view model from saved manual journal entry — no recalculation path. */
export function buildFinanceVoucherPrintModelFromManualJournalEntry(
  entry: ManualJournalEntryRead,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const totals = computeManualJournalLineTotals(
    entry.lines.map((line) => ({
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo ?? "",
    }))
  )

  const branchLabel = options?.branchLabel?.trim() || entry.branchId

  return {
    documentTypeCode: documentTypeCodeFromEntryNo(entry.entryNo, entry.entryType),
    documentTypeTitle: formatFinanceDocumentTypeTitle(entry.entryType),
    documentNo: formatManualJournalEntryDocumentNo(entry.entryNo, entry.entryType),
    documentDate: formatFinanceDocumentDate(entry.entryDate),
    legalEntityLabel: formatEntityShort(entry.legalEntityCode),
    branchLabel,
    status: String(entry.status).toUpperCase(),
    reference: entry.refNo?.trim() || null,
    description: entry.description?.trim() || null,
    remarks: entry.cancelReason?.trim() || null,
    lines: entry.lines.map((line) => ({
      lineNo: line.lineNo,
      accountCode: line.accountCode,
      accountName: line.accountName,
      lineDescription: line.memo,
      debit: line.debit,
      credit: line.credit,
    })),
    totalDebit: String(totals.debit),
    totalCredit: String(totals.credit),
    preparedBy: entry.createdByStaffId,
    checkedBy: entry.confirmedByStaffId,
    approvedBy: entry.submittedByStaffId,
    postedBy: entry.postedByStaffId,
    postedAt: entry.postedAt,
    postedAtDisplay: entry.postedAt ? formatDateTime(entry.postedAt) : null,
    evidenceRef: entry.refNo?.trim() || null,
    attachmentRef: null,
    accountingVoucherId: entry.postedVoucherId,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    confirmedAt: entry.confirmedAt,
  }
}

function buildPaymentVoucherPrintLines(
  entry: PaymentVoucherRead
): FinanceVoucherPrintLine[] {
  const debitLines = entry.lines.map((line) => ({
    lineNo: line.lineNo,
    accountCode: line.accountCode,
    accountName: line.accountName,
    lineDescription: line.memo,
    debit: line.debit,
    credit: line.credit,
  }))

  const total = entry.totalAmount
  const creditLineNo =
    debitLines.length > 0
      ? Math.max(...debitLines.map((line) => line.lineNo)) + 1
      : 1

  return [
    ...debitLines,
    {
      lineNo: creditLineNo,
      accountCode: entry.payFromAccountCode,
      accountName: entry.payFromAccountName,
      lineDescription: entry.payeeName ? `Payment to ${entry.payeeName}` : null,
      debit: "0.00",
      credit: total,
    },
  ]
}

/** Build browser-print view model from saved payment voucher — includes derived credit line. */
export function buildFinanceVoucherPrintModelFromPaymentVoucher(
  entry: PaymentVoucherRead,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const lines = buildPaymentVoucherPrintLines(entry)
  const total = entry.totalAmount
  const branchLabel = options?.branchLabel?.trim() || entry.branchId

  return {
    documentTypeCode: PAYMENT_VOUCHER_DOCUMENT_CODE,
    documentTypeTitle: PAYMENT_VOUCHER_TYPE_TITLE,
    documentNo: formatPaymentVoucherDocumentNo(entry.entryNo),
    documentDate: formatFinanceDocumentDate(entry.entryDate),
    legalEntityLabel: formatEntityShort(entry.legalEntityCode),
    branchLabel,
    status: String(entry.status).toUpperCase(),
    reference: entry.refNo?.trim() || null,
    description: entry.description?.trim() || null,
    remarks: entry.cancelReason?.trim() || null,
    lines,
    totalDebit: total,
    totalCredit: total,
    preparedBy: entry.createdByStaffId,
    checkedBy: entry.confirmedByStaffId,
    approvedBy: entry.submittedByStaffId,
    postedBy: entry.postedByStaffId,
    postedAt: entry.postedAt,
    postedAtDisplay: entry.postedAt ? formatDateTime(entry.postedAt) : null,
    evidenceRef: entry.refNo?.trim() || null,
    attachmentRef: null,
    accountingVoucherId: entry.postedVoucherId,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    confirmedAt: entry.confirmedAt,
    payeeName: entry.payeeName,
    payFromLabel: formatPayFromAccountLabel(
      entry.payFromAccountCode,
      entry.payFromAccountName
    ),
    chequeNo: entry.chequeNo?.trim() || null,
  }
}
