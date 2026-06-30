import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  buildOperationalVoucherEditorPath,
  buildOperationalVoucherPrintPath,
  buildOperationalVoucherPrintPathByDocType,
} from "@/lib/finance-ui/finance-voucher-print-path"
import { VOUCHER_INQUIRY_DOC_TYPE } from "./voucher-document-types"
import { buildPosOriginShopPath } from "./pos-origin-shop-path"

const OPENING_BALANCE_PATH = "/finance/opening-balance"
const MANUAL_JOURNAL_PATH = "/finance/manual-journal-entries"
const PAYMENT_VOUCHER_PATH = "/finance/payment-vouchers"
const REVENUE_VOUCHER_PATH = "/finance/revenue-vouchers"
const PETTY_CASH_VOUCHER_PATH = "/finance/petty-cash-vouchers"
const VOUCHER_INQUIRY_PATH = "/finance/vouchers"

export function buildPostedVoucherInquiryPath(voucherId: string): string {
  return `${VOUCHER_INQUIRY_PATH}/${encodeURIComponent(voucherId)}`
}

export function buildPostedPosOriginInquiryPath(input: {
  refType: string
  refId: string
  branchId?: string
}): string | null {
  return buildPosOriginShopPath({
    refType: input.refType,
    refId: input.refId,
    branchId: input.branchId,
  })
}

export function buildPostedPosOriginPrintPath(input: {
  refType: string
  refId: string
  branchId?: string
}): string | null {
  return buildPosOriginShopPath({
    refType: input.refType,
    refId: input.refId,
    branchId: input.branchId,
    autoprint: true,
  })
}

export function resolvePostedVoucherInquiryPath(input: {
  voucherId: string
  refType: string
  refId: string
  branchId?: string
}): string {
  return (
    buildPostedPosOriginInquiryPath(input) ??
    buildOperationalVoucherEditorPath(input.refType, input.refId) ??
    buildPostedVoucherInquiryPath(input.voucherId)
  )
}

export function resolvePostedVoucherPrintPath(input: {
  refType: string
  refId: string
  branchId?: string
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

  return buildOperationalVoucherPrintPath(input.refType, input.refId)
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
  return buildOperationalVoucherPrintPathByDocType(input.documentTypeCode, input.id)
}

export function buildManualJournalPdfApiPath(entryId: string): string {
  return `/api/finance/manual-journal-entries/${encodeURIComponent(entryId)}/pdf`
}
