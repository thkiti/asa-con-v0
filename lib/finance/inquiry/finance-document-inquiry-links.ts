import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { VOUCHER_INQUIRY_DOC_TYPE } from "./voucher-document-types"

const OPENING_BALANCE_PATH = "/finance/opening-balance"
const MANUAL_JOURNAL_PATH = "/finance/manual-journal-entries"
const PAYMENT_VOUCHER_PATH = "/finance/payment-vouchers"
const REVENUE_VOUCHER_PATH = "/finance/revenue-vouchers"
const PETTY_CASH_VOUCHER_PATH = "/finance/petty-cash-vouchers"
const VOUCHER_INQUIRY_PATH = "/finance/vouchers"
const SHOP_RECEIPT_PATH = "/shop/receipt"
const SHOP_REFUND_RECEIPT_PATH = "/shop/refund-receipt"

export function buildPostedVoucherInquiryPath(voucherId: string): string {
  return `${VOUCHER_INQUIRY_PATH}/${encodeURIComponent(voucherId)}`
}

export function buildPostedPosOriginInquiryPath(input: {
  refType: string
  refId: string
}): string | null {
  const id = input.refId.trim()
  if (!id) return null

  if (input.refType === FINANCE_REF_TYPES.POS_SALE) {
    return `${SHOP_RECEIPT_PATH}/${encodeURIComponent(id)}`
  }

  if (input.refType === FINANCE_REF_TYPES.POS_REFUND) {
    return `${SHOP_REFUND_RECEIPT_PATH}/${encodeURIComponent(id)}`
  }

  return null
}

export function buildPostedPosOriginPrintPath(input: {
  refType: string
  refId: string
}): string | null {
  const inquiryPath = buildPostedPosOriginInquiryPath(input)
  if (!inquiryPath) return null
  return `${inquiryPath}?autoprint=1`
}

export function resolvePostedVoucherInquiryPath(input: {
  voucherId: string
  refType: string
  refId: string
}): string {
  return (
    buildPostedPosOriginInquiryPath(input) ??
    buildPostedVoucherInquiryPath(input.voucherId)
  )
}

export function resolvePostedVoucherPrintPath(input: {
  refType: string
  refId: string
}): string | null {
  return (
    buildPostedPosOriginPrintPath(input) ?? buildPostedVoucherPrintPath(input)
  )
}

export function buildPostedVoucherPrintPath(input: {
  refType: string
  refId: string
}): string | null {
  const id = input.refId.trim()
  if (!id) return null

  if (input.refType === FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL) {
    return `${OPENING_BALANCE_PATH}/${encodeURIComponent(id)}/print`
  }

  if (
    input.refType === FINANCE_REF_TYPES.MANUAL_JOURNAL ||
    input.refType === FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL ||
    input.refType === FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL ||
    input.refType === FINANCE_REF_TYPES.RECLASS_JOURNAL ||
    input.refType === FINANCE_REF_TYPES.ACCRUAL_JOURNAL ||
    input.refType === FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL
  ) {
    return `${MANUAL_JOURNAL_PATH}/${encodeURIComponent(id)}/print`
  }

  return null
}

export function buildUnpostedOperationalInquiryPath(input: {
  documentTypeCode: string
  id: string
}): string {
  const id = encodeURIComponent(input.id)
  switch (input.documentTypeCode) {
    case VOUCHER_INQUIRY_DOC_TYPE.OPB:
      return `${OPENING_BALANCE_PATH}/${id}`
    case VOUCHER_INQUIRY_DOC_TYPE.MJV:
      return `${MANUAL_JOURNAL_PATH}/${id}`
    case VOUCHER_INQUIRY_DOC_TYPE.PAV:
      return `${PAYMENT_VOUCHER_PATH}/${id}`
    case VOUCHER_INQUIRY_DOC_TYPE.REV:
      return `${REVENUE_VOUCHER_PATH}/${id}`
    case VOUCHER_INQUIRY_DOC_TYPE.PCV:
      return `${PETTY_CASH_VOUCHER_PATH}/${id}`
    default:
      return `${MANUAL_JOURNAL_PATH}/${id}`
  }
}

export function buildUnpostedOperationalPrintPath(input: {
  documentTypeCode: string
  id: string
  status: string
}): string | null {
  if (input.status !== "POSTED") return null
  const id = encodeURIComponent(input.id)
  if (
    input.documentTypeCode === VOUCHER_INQUIRY_DOC_TYPE.MJV ||
    input.documentTypeCode === VOUCHER_INQUIRY_DOC_TYPE.OPB
  ) {
    const base =
      input.documentTypeCode === VOUCHER_INQUIRY_DOC_TYPE.OPB
        ? OPENING_BALANCE_PATH
        : MANUAL_JOURNAL_PATH
    return `${base}/${id}/print`
  }
  return null
}

export function buildManualJournalPdfApiPath(entryId: string): string {
  return `/api/finance/manual-journal-entries/${encodeURIComponent(entryId)}/pdf`
}
