import {
  applyVoucherInquiryNoToFilter,
  resolveVoucherInquiryNoDisplay,
  splitVoucherInquiryNoFilter,
} from "@/lib/finance-ui/voucher-inquiry-no-filter"

describe("voucher inquiry combined No filter", () => {
  it("displays document no before voucher no", () => {
    expect(
      resolveVoucherInquiryNoDisplay({
        documentNo: "MJV-260001",
        voucherNo: "V-2026-06-00001",
      })
    ).toBe("MJV-260001")
    expect(resolveVoucherInquiryNoDisplay({ voucherNo: "V-2026-06-00001" })).toBe(
      "V-2026-06-00001"
    )
  })

  it("routes V-prefixed and digit-only values to voucher no", () => {
    expect(splitVoucherInquiryNoFilter("V-2026-06-00008")).toEqual({
      voucherNo: "V-2026-06-00008",
    })
    expect(splitVoucherInquiryNoFilter("8")).toEqual({ voucherNo: "8" })
  })

  it("routes business document numbers to document no", () => {
    expect(splitVoucherInquiryNoFilter("MJV-260001")).toEqual({
      documentNo: "MJV-260001",
      refNo: "MJV-260001",
    })
    expect(splitVoucherInquiryNoFilter("REC-SH001-202606-0001")).toEqual({
      documentNo: "REC-SH001-202606-0001",
      refNo: "REC-SH001-202606-0001",
    })
  })

  it("replaces prior no fields when applying combined filter", () => {
    expect(
      applyVoucherInquiryNoToFilter(
        {
          documentNo: "OLD",
          refNo: "OLD",
          voucherNo: "OLD-V",
          periodKey: "2026-06",
        },
        "MJV-260001"
      )
    ).toEqual({
      periodKey: "2026-06",
      documentNo: "MJV-260001",
      refNo: "MJV-260001",
    })
  })
})
