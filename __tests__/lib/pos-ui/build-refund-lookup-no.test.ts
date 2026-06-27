import { buildRefundLookupNo } from "@/lib/pos-ui/build-refund-lookup-no"

describe("buildRefundLookupNo", () => {
  it("builds full refund number from branch, year, month, and running no", () => {
    expect(buildRefundLookupNo("SH001", 2026, 6, "0008")).toBe(
      "REF-SH001-202606-0008"
    )
  })

  it("pads short running numbers to four digits", () => {
    expect(buildRefundLookupNo("SH001", 2026, 6, "8")).toBe(
      "REF-SH001-202606-0008"
    )
  })

  it("returns null when running number is empty", () => {
    expect(buildRefundLookupNo("SH001", 2026, 6, "")).toBeNull()
  })
})
