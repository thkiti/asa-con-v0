import {
  buildSnapshotDetailPath,
  buildVoucherDetailPath,
  formatOperationalSourceLabel,
  formatVoucherLinkLabel,
} from "@/lib/finance-ui/trace-links"

describe("trace-links", () => {
  it("builds voucher detail paths", () => {
    expect(buildVoucherDetailPath("voucher-1")).toBe("/finance/vouchers/voucher-1")
    expect(buildVoucherDetailPath("voucher-1", "/finance/reconciliation")).toBe(
      `/finance/vouchers/voucher-1?returnTo=${encodeURIComponent("/finance/reconciliation")}`
    )
  })

  it("builds snapshot detail paths", () => {
    expect(buildSnapshotDetailPath("snap-1")).toBe(
      "/finance/reconciliation/snapshots/snap-1"
    )
  })

  it("formats operational and voucher labels", () => {
    expect(
      formatOperationalSourceLabel({ sourceType: "SALE", documentRef: "s1" })
    ).toBe("POS sale · s1")
    expect(formatVoucherLinkLabel({ voucherNo: "V-1", id: "v1" })).toBe("V-1")
  })
})
