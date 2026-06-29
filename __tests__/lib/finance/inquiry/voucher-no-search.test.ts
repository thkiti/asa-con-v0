import {
  buildPeriodVoucherNo,
  isFullVoucherNoInput,
  padVoucherRunningNumber,
  resolveVoucherInquiryVoucherNoSearch,
} from "@/lib/finance/inquiry/voucher-no-search"

describe("voucher inquiry voucher no search", () => {
  it("detects full voucher number input", () => {
    expect(isFullVoucherNoInput("V-2026-06-00008")).toBe(true)
    expect(isFullVoucherNoInput("0001")).toBe(false)
  })

  it("pads running numbers to five digits", () => {
    expect(padVoucherRunningNumber("1")).toBe("00001")
    expect(padVoucherRunningNumber("00008")).toBe("00008")
  })

  it("builds period voucher number from running number", () => {
    expect(buildPeriodVoucherNo("2026-06", "1")).toBe("V-2026-06-00001")
    expect(buildPeriodVoucherNo("2026-06", "8")).toBe("V-2026-06-00008")
  })

  it("uses exact match when period and running number are provided", () => {
    expect(resolveVoucherInquiryVoucherNoSearch("1", "2026-06")).toEqual({
      mode: "equals",
      value: "V-2026-06-00001",
    })
    expect(resolveVoucherInquiryVoucherNoSearch("00008", "2026-06")).toEqual({
      mode: "equals",
      value: "V-2026-06-00008",
    })
  })

  it("uses contains for full voucher numbers", () => {
    expect(resolveVoucherInquiryVoucherNoSearch("V-2026-06-00008", "2026-06")).toEqual({
      mode: "contains",
      value: "V-2026-06-00008",
    })
  })

  it("uses suffix contains when period is missing", () => {
    expect(resolveVoucherInquiryVoucherNoSearch("8", undefined)).toEqual({
      mode: "contains",
      value: "-00008",
    })
  })
})
