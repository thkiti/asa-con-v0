import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { VOUCHER_INQUIRY_DOC_TYPE } from "@/lib/finance/inquiry/voucher-document-types"
import {
  buildOperationalVoucherEditorPath,
  buildOperationalVoucherPrintPath,
  buildOperationalVoucherPrintPathByDocType,
  isOperationalVoucherRefType,
} from "@/lib/finance-ui/finance-voucher-print-path"

describe("finance-voucher-print-path", () => {
  it("builds operational editor paths for PAV, REV, and PCV", () => {
    expect(
      buildOperationalVoucherEditorPath(FINANCE_REF_TYPES.PAYMENT_VOUCHER, "pav-1")
    ).toBe("/finance/payment-vouchers/pav-1")
    expect(
      buildOperationalVoucherEditorPath(FINANCE_REF_TYPES.REVENUE_VOUCHER, "rev-1")
    ).toBe("/finance/revenue-vouchers/rev-1")
    expect(
      buildOperationalVoucherEditorPath(FINANCE_REF_TYPES.PETTY_CASH_VOUCHER, "pcv-1")
    ).toBe("/finance/petty-cash-vouchers/pcv-1")
  })

  it("appends autoprint query for operational voucher print paths", () => {
    expect(
      buildOperationalVoucherPrintPath(FINANCE_REF_TYPES.PAYMENT_VOUCHER, "pav-1")
    ).toBe("/finance/payment-vouchers/pav-1?autoprint=1")
    expect(
      buildOperationalVoucherPrintPath(FINANCE_REF_TYPES.REVENUE_VOUCHER, "rev-1")
    ).toBe("/finance/revenue-vouchers/rev-1?autoprint=1")
    expect(
      buildOperationalVoucherPrintPath(FINANCE_REF_TYPES.PETTY_CASH_VOUCHER, "pcv-1")
    ).toBe("/finance/petty-cash-vouchers/pcv-1?autoprint=1")
  })

  it("builds print paths by inquiry doc type code", () => {
    expect(buildOperationalVoucherPrintPathByDocType(VOUCHER_INQUIRY_DOC_TYPE.PAV, "pav-1")).toBe(
      "/finance/payment-vouchers/pav-1?autoprint=1"
    )
    expect(buildOperationalVoucherPrintPathByDocType(VOUCHER_INQUIRY_DOC_TYPE.REV, "rev-1")).toBe(
      "/finance/revenue-vouchers/rev-1?autoprint=1"
    )
    expect(buildOperationalVoucherPrintPathByDocType(VOUCHER_INQUIRY_DOC_TYPE.PCV, "pcv-1")).toBe(
      "/finance/petty-cash-vouchers/pcv-1?autoprint=1"
    )
    expect(buildOperationalVoucherPrintPathByDocType(VOUCHER_INQUIRY_DOC_TYPE.MJV, "mje-1")).toBe(
      "/finance/manual-journal-entries/mje-1/print"
    )
    expect(buildOperationalVoucherPrintPathByDocType(VOUCHER_INQUIRY_DOC_TYPE.OPB, "opb-1")).toBe(
      "/finance/opening-balance/opb-1/print"
    )
  })

  it("identifies operational voucher ref types", () => {
    expect(isOperationalVoucherRefType(FINANCE_REF_TYPES.PAYMENT_VOUCHER)).toBe(true)
    expect(isOperationalVoucherRefType(FINANCE_REF_TYPES.REVENUE_VOUCHER)).toBe(true)
    expect(isOperationalVoucherRefType(FINANCE_REF_TYPES.PETTY_CASH_VOUCHER)).toBe(true)
    expect(isOperationalVoucherRefType(FINANCE_REF_TYPES.MANUAL_JOURNAL)).toBe(false)
  })
})
