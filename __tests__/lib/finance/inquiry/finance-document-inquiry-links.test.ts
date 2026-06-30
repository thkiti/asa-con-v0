import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  buildPostedPosOriginInquiryPath,
  buildPostedPosOriginPrintPath,
  buildPostedVoucherInquiryPath,
  resolvePostedVoucherInquiryPath,
  resolvePostedVoucherPrintPath,
} from "@/lib/finance/inquiry/finance-document-inquiry-links"

describe("finance document inquiry links", () => {
  it("routes REC posted vouchers to shop receipt inquiry", () => {
    expect(
      buildPostedPosOriginInquiryPath({
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-1",
      })
    ).toBe("/shop/receipt/sale-1")
    expect(
      buildPostedPosOriginInquiryPath({
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-1",
        branchId: "branch-1",
      })
    ).toBe("/shop/receipt/sale-1?branchId=branch-1")
    expect(
      resolvePostedVoucherInquiryPath({
        voucherId: "voucher-rec-1",
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-1",
        branchId: "branch-1",
      })
    ).toBe("/shop/receipt/sale-1?branchId=branch-1")
  })

  it("routes REF posted vouchers to shop refund receipt inquiry", () => {
    expect(
      buildPostedPosOriginInquiryPath({
        refType: FINANCE_REF_TYPES.POS_REFUND,
        refId: "refund-1",
      })
    ).toBe("/shop/refund-receipt/refund-1")
    expect(
      resolvePostedVoucherInquiryPath({
        voucherId: "voucher-ref-1",
        refType: FINANCE_REF_TYPES.POS_REFUND,
        refId: "refund-1",
      })
    ).toBe("/shop/refund-receipt/refund-1")
  })

  it("falls back to voucher inquiry for non-POS ref types without operational editor", () => {
    expect(
      resolvePostedVoucherInquiryPath({
        voucherId: "voucher-mjv-1",
        refType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
        refId: "mje-1",
      })
    ).toBe(buildPostedVoucherInquiryPath("voucher-mjv-1"))
  })

  it("routes PAV, REV, and PCV posted vouchers to operational editors", () => {
    expect(
      resolvePostedVoucherInquiryPath({
        voucherId: "voucher-pav-1",
        refType: FINANCE_REF_TYPES.PAYMENT_VOUCHER,
        refId: "pav-1",
      })
    ).toBe("/finance/payment-vouchers/pav-1")
    expect(
      resolvePostedVoucherInquiryPath({
        voucherId: "voucher-rev-1",
        refType: FINANCE_REF_TYPES.REVENUE_VOUCHER,
        refId: "rev-1",
      })
    ).toBe("/finance/revenue-vouchers/rev-1")
    expect(
      resolvePostedVoucherInquiryPath({
        voucherId: "voucher-pcv-1",
        refType: FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
        refId: "pcv-1",
      })
    ).toBe("/finance/petty-cash-vouchers/pcv-1")
  })

  it("exposes operational voucher print paths with autoprint", () => {
    expect(
      resolvePostedVoucherPrintPath({
        refType: FINANCE_REF_TYPES.PAYMENT_VOUCHER,
        refId: "pav-1",
      })
    ).toBe("/finance/payment-vouchers/pav-1?autoprint=1")
    expect(
      resolvePostedVoucherPrintPath({
        refType: FINANCE_REF_TYPES.REVENUE_VOUCHER,
        refId: "rev-1",
      })
    ).toBe("/finance/revenue-vouchers/rev-1?autoprint=1")
    expect(
      resolvePostedVoucherPrintPath({
        refType: FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
        refId: "pcv-1",
      })
    ).toBe("/finance/petty-cash-vouchers/pcv-1?autoprint=1")
  })

  it("exposes POS-origin print paths with branchId and autoprint", () => {
    expect(
      buildPostedPosOriginPrintPath({
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-1",
        branchId: "branch-1",
      })
    ).toBe("/shop/receipt/sale-1?branchId=branch-1&autoprint=1")
    expect(
      resolvePostedVoucherPrintPath({
        refType: FINANCE_REF_TYPES.POS_REFUND,
        refId: "refund-1",
        branchId: "branch-1",
      })
    ).toBe("/shop/refund-receipt/refund-1?branchId=branch-1&autoprint=1")
    expect(
      resolvePostedVoucherPrintPath({
        refType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
        refId: "mje-1",
      })
    ).toBe("/finance/manual-journal-entries/mje-1/print")
  })
})
