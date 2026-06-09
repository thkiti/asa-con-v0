import {
  buildPaymentSlipBlobPath,
  assertSafeReceiptNo,
  assertSafeBranchCode,
} from "@/lib/pos/payment-slip-blob"

describe("payment-slip-blob paths", () => {
  it("builds payment-slips/{branchCode}/{receiptNo}.jpg", () => {
    expect(buildPaymentSlipBlobPath("SH001", "REC-SH001-202606-0001")).toBe(
      "payment-slips/SH001/REC-SH001-202606-0001.jpg"
    )
  })

  it("normalizes branch code and receipt number", () => {
    expect(buildPaymentSlipBlobPath("sh001", "rec-sh001-202606-0042")).toBe(
      "payment-slips/SH001/REC-SH001-202606-0042.jpg"
    )
  })

  it("rejects invalid receipt numbers", () => {
    expect(() => assertSafeReceiptNo("../evil")).toThrow()
    expect(() => assertSafeReceiptNo("REC-BAD")).toThrow()
  })

  it("rejects invalid branch codes", () => {
    expect(() => assertSafeBranchCode("SH 001")).toThrow()
  })
})
