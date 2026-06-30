import type { DocumentKind } from "@/generated/prisma/client"
import { VOUCHER_INQUIRY_DOC_TYPE } from "@/lib/finance/inquiry/voucher-document-types"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

const REF_TYPE_TO_DOCUMENT_KIND: Record<string, DocumentKind> = {
  [FINANCE_REF_TYPES.PAYMENT_VOUCHER]: "PAV",
  [FINANCE_REF_TYPES.REVENUE_VOUCHER]: "REV",
  [FINANCE_REF_TYPES.PETTY_CASH_VOUCHER]: "PCV",
}

const DOC_TYPE_TO_DOCUMENT_KIND: Record<string, DocumentKind> = {
  [VOUCHER_INQUIRY_DOC_TYPE.PAV]: "PAV",
  [VOUCHER_INQUIRY_DOC_TYPE.REV]: "REV",
  [VOUCHER_INQUIRY_DOC_TYPE.PCV]: "PCV",
}

export const OPERATIONAL_VOUCHER_REF_TYPES = new Set<string>(
  Object.keys(REF_TYPE_TO_DOCUMENT_KIND)
)

export function resolveOperationalVoucherDocumentKind(
  refType: string
): DocumentKind | null {
  return REF_TYPE_TO_DOCUMENT_KIND[refType] ?? null
}

export function resolveOperationalVoucherDocumentKindByDocType(
  documentTypeCode: string
): DocumentKind | null {
  return DOC_TYPE_TO_DOCUMENT_KIND[documentTypeCode] ?? null
}
