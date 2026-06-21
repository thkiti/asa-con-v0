import { buildRevenueVoucherNo, REVENUE_VOUCHER_DOCUMENT_CODE } from "@/lib/finance/revenue-voucher/revenue-voucher-allocate-no"

describe("REV number prefix", () => {
  it("builds REV-YYnnnn document numbers", () => {
    expect(REVENUE_VOUCHER_DOCUMENT_CODE).toBe("REV")
    expect(buildRevenueVoucherNo(new Date("2026-06-14T12:00:00.000Z"), 1)).toBe("REV-260001")
    expect(buildRevenueVoucherNo(new Date("2026-06-14T12:00:00.000Z"), 42)).toBe("REV-260042")
  })
})
