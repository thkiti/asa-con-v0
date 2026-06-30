import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { isManualJournalPdfReadable } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"
import type { FinanceVoucherListRow } from "./voucher-list-types"

const MANUAL_JOURNAL_FAMILY = new Set<string>([
  FINANCE_REF_TYPES.MANUAL_JOURNAL,
  FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL,
  FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
  FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL,
  FINANCE_REF_TYPES.RECLASS_JOURNAL,
  FINANCE_REF_TYPES.ACCRUAL_JOURNAL,
  FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL,
])

export { MANUAL_JOURNAL_FAMILY }

export function resolvePostedVoucherPdfAvailable(input: {
  refType: string
  status: string
  manualJournalEntry?: {
    status: string
    pdfPath: string | null
    pdfBlobUrl?: string | null
  } | null
}): boolean | null {
  if (!MANUAL_JOURNAL_FAMILY.has(input.refType)) {
    return null
  }

  if (input.status !== "POSTED") {
    return null
  }

  const entry = input.manualJournalEntry
  if (!entry) {
    return false
  }

  return isManualJournalPdfReadable(entry)
}

export function resolvePostedVoucherDocumentNo(input: {
  refType: string
  refNo: string | null
  manualJournalEntry?: { entryNo: string } | null
  paymentVoucher?: { entryNo: string } | null
  revenueVoucher?: { entryNo: string } | null
  pettyCashVoucher?: { entryNo: string } | null
}): string | null {
  if (input.manualJournalEntry?.entryNo) return input.manualJournalEntry.entryNo
  if (input.paymentVoucher?.entryNo) return input.paymentVoucher.entryNo
  if (input.revenueVoucher?.entryNo) return input.revenueVoucher.entryNo
  if (input.pettyCashVoucher?.entryNo) return input.pettyCashVoucher.entryNo
  return input.refNo
}

export function resolvePostedVoucherAmount(totalDebit: string, totalCredit: string): string {
  const debit = Number(totalDebit)
  const credit = Number(totalCredit)
  if (!Number.isNaN(debit) && debit > 0) return totalDebit
  if (!Number.isNaN(credit) && credit > 0) return totalCredit
  return totalDebit
}

export function matchesAmountRange(
  amount: string,
  amountMin?: string | number,
  amountMax?: string | number
): boolean {
  const value = Number(amount)
  if (Number.isNaN(value)) return false

  const min = amountMin != null && String(amountMin).trim() !== "" ? Number(amountMin) : null
  const max = amountMax != null && String(amountMax).trim() !== "" ? Number(amountMax) : null

  if (min != null && !Number.isNaN(min) && value < min) return false
  if (max != null && !Number.isNaN(max) && value > max) return false
  return true
}

export function matchesPdfStateFilter(
  pdfAvailable: boolean | null,
  pdfState?: "has" | "missing"
): boolean {
  if (!pdfState) return true
  if (pdfAvailable === null) return false
  return pdfState === "has" ? pdfAvailable : !pdfAvailable
}

export function mapVoucherRowToInquiryFields(
  row: Pick<
    FinanceVoucherListRow,
    | "refType"
    | "refNo"
    | "status"
    | "totalDebit"
    | "totalCredit"
    | "documentTypeCode"
    | "documentNo"
    | "amount"
    | "pdfAvailable"
  >
): Pick<FinanceVoucherListRow, "documentTypeCode" | "documentNo" | "amount" | "pdfAvailable"> {
  return {
    documentTypeCode: row.documentTypeCode,
    documentNo: row.documentNo,
    amount: row.amount,
    pdfAvailable: row.pdfAvailable,
  }
}
