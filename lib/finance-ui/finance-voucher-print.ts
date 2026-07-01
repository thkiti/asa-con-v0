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
import { resolveFinanceBranchLabel } from "@/lib/finance-ui/finance-branch-display"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { PaymentVoucherRead } from "@/lib/finance/payment-voucher/payment-voucher-read-types"
import type { InvoiceVoucherRead } from "@/lib/finance/invoice-voucher/invoice-voucher-read-types"
import type { RevenueVoucherRead } from "@/lib/finance/revenue-voucher/revenue-voucher-read-types"
import type { PettyCashVoucherRead } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read-types"
import {
  formatPayFromAccountLabel,
  formatPaymentVoucherDocumentNo,
  PAYMENT_VOUCHER_DOCUMENT_CODE,
  PAYMENT_VOUCHER_TYPE_TITLE,
} from "@/lib/finance-ui/payment-voucher-display"
import {
  formatInvoiceVoucherDocumentNo,
  INVOICE_VOUCHER_DOCUMENT_CODE,
  INVOICE_VOUCHER_TYPE_TITLE,
} from "@/lib/finance-ui/invoice-voucher-display"
import {
  formatReceiveToAccountLabel,
  formatRevenueVoucherDocumentNo,
  REVENUE_VOUCHER_DOCUMENT_CODE,
  REVENUE_VOUCHER_TYPE_TITLE,
} from "@/lib/finance-ui/revenue-voucher-display"
import {
  formatPettyCashVoucherDocumentNo,
  PETTY_CASH_VOUCHER_DOCUMENT_CODE,
  PETTY_CASH_VOUCHER_TYPE_TITLE,
} from "@/lib/finance-ui/petty-cash-voucher-display"

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
  /** INV / REV / PCV supplementary context. */
  customerName?: string | null
  dueDate?: string | null
  receivedFromName?: string | null
  receiveToLabel?: string | null
  receiptNo?: string | null
  pettyCashAccountLabel?: string | null
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

  const branchLabel = resolveFinanceBranchLabel({
    branchCode: entry.branchCode,
    branchName: entry.branchName,
    overrideLabel: options?.branchLabel,
  })

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
  return entry.lines.map((line) => ({
    lineNo: line.lineNo,
    accountCode: line.accountCode,
    accountName: line.accountName,
    lineDescription: line.memo,
    debit: line.debit,
    credit: line.credit,
  }))
}

/** Build browser-print view model from saved payment voucher lines. */
export function buildFinanceVoucherPrintModelFromPaymentVoucher(
  entry: PaymentVoucherRead,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const lines = buildPaymentVoucherPrintLines(entry)
  const totalDebit = lines.reduce(
    (sum, line) => sum + Number.parseFloat(line.debit || "0"),
    0
  )
  const totalCredit = lines.reduce(
    (sum, line) => sum + Number.parseFloat(line.credit || "0"),
    0
  )
  const branchLabel = resolveFinanceBranchLabel({
    overrideLabel: options?.branchLabel,
  })

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
    totalDebit: String(totalDebit),
    totalCredit: String(totalCredit),
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

function sumPrintLineTotals(lines: FinanceVoucherPrintLine[]): {
  totalDebit: string
  totalCredit: string
} {
  const totalDebit = lines.reduce(
    (sum, line) => sum + Number.parseFloat(line.debit || "0"),
    0
  )
  const totalCredit = lines.reduce(
    (sum, line) => sum + Number.parseFloat(line.credit || "0"),
    0
  )
  return { totalDebit: String(totalDebit), totalCredit: String(totalCredit) }
}

function buildWorkflowVoucherPrintModel(input: {
  documentTypeCode: string
  documentTypeTitle: string
  documentNo: string
  documentDate: string
  legalEntityCode: string
  branchLabel: string
  status: string
  reference: string | null
  description: string | null
  remarks: string | null
  lines: FinanceVoucherPrintLine[]
  createdByStaffId: string
  submittedByStaffId: string | null
  confirmedByStaffId: string | null
  postedByStaffId: string | null
  postedAt: string | null
  postedVoucherId: string | null
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  extras?: Partial<
    Pick<
      FinanceVoucherPrintModel,
      | "payeeName"
      | "payFromLabel"
      | "chequeNo"
      | "customerName"
      | "dueDate"
      | "receivedFromName"
      | "receiveToLabel"
      | "receiptNo"
      | "pettyCashAccountLabel"
    >
  >
}): FinanceVoucherPrintModel {
  const { totalDebit, totalCredit } = sumPrintLineTotals(input.lines)
  return {
    documentTypeCode: input.documentTypeCode,
    documentTypeTitle: input.documentTypeTitle,
    documentNo: input.documentNo,
    documentDate: input.documentDate,
    legalEntityLabel: formatEntityShort(input.legalEntityCode),
    branchLabel: input.branchLabel,
    status: input.status,
    reference: input.reference,
    description: input.description,
    remarks: input.remarks,
    lines: input.lines,
    totalDebit,
    totalCredit,
    preparedBy: input.createdByStaffId,
    checkedBy: input.confirmedByStaffId,
    approvedBy: input.submittedByStaffId,
    postedBy: input.postedByStaffId,
    postedAt: input.postedAt,
    postedAtDisplay: input.postedAt ? formatDateTime(input.postedAt) : null,
    evidenceRef: input.reference,
    attachmentRef: null,
    accountingVoucherId: input.postedVoucherId,
    createdAt: input.createdAt,
    submittedAt: input.submittedAt,
    confirmedAt: input.confirmedAt,
    ...input.extras,
  }
}

function mapWorkflowVoucherLines(
  lines: Array<{
    lineNo: number
    accountCode: string
    accountName: string
    debit: string
    credit: string
    memo: string | null
  }>
): FinanceVoucherPrintLine[] {
  return lines.map((line) => ({
    lineNo: line.lineNo,
    accountCode: line.accountCode,
    accountName: line.accountName,
    lineDescription: line.memo,
    debit: line.debit,
    credit: line.credit,
  }))
}

/** Build browser-print view model from saved invoice voucher lines. */
export function buildFinanceVoucherPrintModelFromInvoiceVoucher(
  entry: InvoiceVoucherRead,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const branchLabel = resolveFinanceBranchLabel({
    overrideLabel: options?.branchLabel,
  })
  return buildWorkflowVoucherPrintModel({
    documentTypeCode: INVOICE_VOUCHER_DOCUMENT_CODE,
    documentTypeTitle: INVOICE_VOUCHER_TYPE_TITLE,
    documentNo: formatInvoiceVoucherDocumentNo(entry.entryNo),
    documentDate: formatFinanceDocumentDate(entry.invoiceDate),
    legalEntityCode: entry.legalEntityCode,
    branchLabel,
    status: String(entry.status).toUpperCase(),
    reference: entry.refNo?.trim() || null,
    description: entry.description?.trim() || null,
    remarks: entry.cancelReason?.trim() || null,
    lines: mapWorkflowVoucherLines(entry.lines),
    createdByStaffId: entry.createdByStaffId,
    submittedByStaffId: entry.submittedByStaffId,
    confirmedByStaffId: entry.confirmedByStaffId,
    postedByStaffId: entry.postedByStaffId,
    postedAt: entry.postedAt,
    postedVoucherId: entry.postedVoucherId,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    confirmedAt: entry.confirmedAt,
    extras: {
      customerName: entry.customerName,
      dueDate: entry.dueDate ? formatFinanceDocumentDate(entry.dueDate) : null,
    },
  })
}

/** Build browser-print view model from saved revenue voucher lines. */
export function buildFinanceVoucherPrintModelFromRevenueVoucher(
  entry: RevenueVoucherRead,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const branchLabel = resolveFinanceBranchLabel({
    overrideLabel: options?.branchLabel,
  })
  return buildWorkflowVoucherPrintModel({
    documentTypeCode: REVENUE_VOUCHER_DOCUMENT_CODE,
    documentTypeTitle: REVENUE_VOUCHER_TYPE_TITLE,
    documentNo: formatRevenueVoucherDocumentNo(entry.entryNo),
    documentDate: formatFinanceDocumentDate(entry.entryDate),
    legalEntityCode: entry.legalEntityCode,
    branchLabel,
    status: String(entry.status).toUpperCase(),
    reference: entry.refNo?.trim() || null,
    description: entry.description?.trim() || null,
    remarks: entry.cancelReason?.trim() || null,
    lines: mapWorkflowVoucherLines(entry.lines),
    createdByStaffId: entry.createdByStaffId,
    submittedByStaffId: entry.submittedByStaffId,
    confirmedByStaffId: entry.confirmedByStaffId,
    postedByStaffId: entry.postedByStaffId,
    postedAt: entry.postedAt,
    postedVoucherId: entry.postedVoucherId,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    confirmedAt: entry.confirmedAt,
    extras: {
      receivedFromName: entry.receivedFromName,
      receiveToLabel: formatReceiveToAccountLabel(
        entry.receiveToAccountCode,
        entry.receiveToAccountName
      ),
      receiptNo: entry.receiptNo?.trim() || null,
    },
  })
}

/** Build browser-print view model from saved petty cash voucher lines. */
export function buildFinanceVoucherPrintModelFromPettyCashVoucher(
  entry: PettyCashVoucherRead,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const branchLabel = resolveFinanceBranchLabel({
    overrideLabel: options?.branchLabel,
  })
  return buildWorkflowVoucherPrintModel({
    documentTypeCode: PETTY_CASH_VOUCHER_DOCUMENT_CODE,
    documentTypeTitle: PETTY_CASH_VOUCHER_TYPE_TITLE,
    documentNo: formatPettyCashVoucherDocumentNo(entry.entryNo),
    documentDate: formatFinanceDocumentDate(entry.entryDate),
    legalEntityCode: entry.legalEntityCode,
    branchLabel,
    status: String(entry.status).toUpperCase(),
    reference: entry.refNo?.trim() || null,
    description: entry.description?.trim() || null,
    remarks: entry.cancelReason?.trim() || null,
    lines: mapWorkflowVoucherLines(entry.lines),
    createdByStaffId: entry.createdByStaffId,
    submittedByStaffId: entry.submittedByStaffId,
    confirmedByStaffId: entry.confirmedByStaffId,
    postedByStaffId: entry.postedByStaffId,
    postedAt: entry.postedAt,
    postedVoucherId: entry.postedVoucherId,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    confirmedAt: entry.confirmedAt,
    extras: {
      payeeName: entry.payeeName,
      pettyCashAccountLabel: formatReceiveToAccountLabel(
        entry.pettyCashAccountCode,
        entry.pettyCashAccountName
      ),
    },
  })
}
