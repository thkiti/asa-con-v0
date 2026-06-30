import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { VOUCHER_INQUIRY_DOC_TYPE } from "@/lib/finance/inquiry/voucher-document-types"

const OPENING_BALANCE_PATH = "/finance/opening-balance"
const MANUAL_JOURNAL_PATH = "/finance/manual-journal-entries"
const PAYMENT_VOUCHER_PATH = "/finance/payment-vouchers"
const REVENUE_VOUCHER_PATH = "/finance/revenue-vouchers"
const PETTY_CASH_VOUCHER_PATH = "/finance/petty-cash-vouchers"

const OPERATIONAL_VOUCHER_REF_TYPES = new Set<string>([
  FINANCE_REF_TYPES.PAYMENT_VOUCHER,
  FINANCE_REF_TYPES.REVENUE_VOUCHER,
  FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
])

export function buildOperationalVoucherEditorPath(refType: string, refId: string): string | null {
  const id = refId.trim()
  if (!id) return null

  switch (refType) {
    case FINANCE_REF_TYPES.PAYMENT_VOUCHER:
      return `${PAYMENT_VOUCHER_PATH}/${encodeURIComponent(id)}`
    case FINANCE_REF_TYPES.REVENUE_VOUCHER:
      return `${REVENUE_VOUCHER_PATH}/${encodeURIComponent(id)}`
    case FINANCE_REF_TYPES.PETTY_CASH_VOUCHER:
      return `${PETTY_CASH_VOUCHER_PATH}/${encodeURIComponent(id)}`
    default:
      return null
  }
}

export function buildOperationalVoucherPrintPath(refType: string, refId: string): string | null {
  const editorPath = buildOperationalVoucherEditorPath(refType, refId)
  if (!editorPath) return null
  return `${editorPath}?autoprint=1`
}

export function buildOperationalVoucherPrintPathByDocType(
  documentTypeCode: string,
  id: string
): string | null {
  const encodedId = encodeURIComponent(id)
  switch (documentTypeCode) {
    case VOUCHER_INQUIRY_DOC_TYPE.PAV:
      return `${PAYMENT_VOUCHER_PATH}/${encodedId}?autoprint=1`
    case VOUCHER_INQUIRY_DOC_TYPE.REV:
      return `${REVENUE_VOUCHER_PATH}/${encodedId}?autoprint=1`
    case VOUCHER_INQUIRY_DOC_TYPE.PCV:
      return `${PETTY_CASH_VOUCHER_PATH}/${encodedId}?autoprint=1`
    case VOUCHER_INQUIRY_DOC_TYPE.MJV:
      return `${MANUAL_JOURNAL_PATH}/${encodedId}/print`
    case VOUCHER_INQUIRY_DOC_TYPE.OPB:
      return `${OPENING_BALANCE_PATH}/${encodedId}/print`
    default:
      return null
  }
}

export function isOperationalVoucherRefType(refType: string): boolean {
  return OPERATIONAL_VOUCHER_REF_TYPES.has(refType)
}
