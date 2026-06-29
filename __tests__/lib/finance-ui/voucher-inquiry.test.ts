import {
  buildVoucherInquiryReturnPath,
  buildVoucherInquirySearchParams,
  parseVoucherInquiryFilterFromSearchParams,
} from "@/lib/finance-ui/voucher-inquiry"
import { buildFinanceVoucherDetailPath } from "@/lib/finance-ui/finance-navigation"

describe("voucher inquiry URL helpers", () => {
  it("parses list filters from search params", () => {
    const params = new URLSearchParams(
      "voucherNo=V-2026&refNo=COL-1&refType=POS_SETTLEMENT_COLLECTOR_PICKUP&periodKey=2026-06&from=2026-06-01&to=2026-06-30"
    )
    expect(parseVoucherInquiryFilterFromSearchParams(params)).toEqual({
      voucherNo: "V-2026",
      refNo: "COL-1",
      refType: "POS_SETTLEMENT_COLLECTOR_PICKUP",
      periodKey: "2026-06",
      from: "2026-06-01",
      to: "2026-06-30",
    })
  })

  it("builds return path preserving filters", () => {
    expect(
      buildVoucherInquiryReturnPath({
        refNo: "COL-260001",
        from: "2026-06-01",
        to: "2026-06-30",
      })
    ).toBe("/finance/vouchers?refNo=COL-260001&from=2026-06-01&to=2026-06-30")
  })

  it("builds detail view href with returnTo for list back navigation", () => {
    const returnTo = buildVoucherInquiryReturnPath({ refNo: "COL-260001" })
    expect(buildFinanceVoucherDetailPath("voucher-pickup-1", returnTo)).toBe(
      "/finance/vouchers/voucher-pickup-1?returnTo=%2Ffinance%2Fvouchers%3FrefNo%3DCOL-260001"
    )
  })

  it("round-trips search params", () => {
    const filter = {
      voucherNo: "V-1",
      refNo: "COL-2",
      periodKey: "2026-06",
    }
    const params = buildVoucherInquirySearchParams(filter)
    expect(parseVoucherInquiryFilterFromSearchParams(params)).toEqual(filter)
  })
})
