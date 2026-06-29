import { formatVoucherInquiryDocTypeLabel } from "./voucher-document-types"

export {
  formatVoucherInquiryDocTypeLabel,
  formatVoucherInquirySourceLabel,
  VOUCHER_INQUIRY_REF_TYPE_LABELS,
} from "./voucher-document-types"

/** Ref type column label — business document code + name. */
export function formatVoucherInquiryRefTypeLabel(refType: string): string {
  return formatVoucherInquiryDocTypeLabel(refType)
}
