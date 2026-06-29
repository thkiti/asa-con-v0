import {
  formatVoucherInquiryDocTypeLabel,
  formatVoucherInquiryRefTypeLabel,
  formatVoucherInquirySourceLabel,
} from "@/lib/finance/inquiry/voucher-inquiry-labels"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("voucher inquiry labels", () => {
  it("maps settlement ref types to business document codes", () => {
    expect(
      formatVoucherInquirySourceLabel(FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP)
    ).toBe("COL • Collector Pickup")
    expect(
      formatVoucherInquirySourceLabel(FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT)
    ).toBe("PAY • Bank Deposit")
    expect(formatVoucherInquirySourceLabel(FINANCE_REF_TYPES.POS_SALE)).toBeNull()
  })

  it("uses business document labels in ref type column", () => {
    expect(
      formatVoucherInquiryRefTypeLabel(FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT)
    ).toBe("PAY • Bank Deposit")
    expect(formatVoucherInquiryDocTypeLabel(FINANCE_REF_TYPES.POS_SALE)).toBe(
      "REC • Receipt"
    )
    expect(formatVoucherInquiryDocTypeLabel(FINANCE_REF_TYPES.POS_REFUND)).toBe(
      "REF • Refund"
    )
    expect(formatVoucherInquiryDocTypeLabel(FINANCE_REF_TYPES.MANUAL_JOURNAL)).toBe(
      "MJV • Manual Journal"
    )
  })

  it("does not use PAY-IN in inquiry document type labels", () => {
    expect(
      formatVoucherInquiryRefTypeLabel(FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT)
    ).not.toContain("PAY-IN")
  })
})
