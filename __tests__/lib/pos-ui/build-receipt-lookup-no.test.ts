import {
  appendReceiptLookupRunningDigit,
  buildReceiptLookupNo,
  defaultRunningNoFromNextPreview,
  normalizeReceiptLookupRunningNo,
  runningNumbersFromReceiptLookupRows,
} from "@/lib/pos-ui/build-receipt-lookup-no"

describe("buildReceiptLookupNo", () => {
  it("builds full receipt number from branch, year, month, and running no", () => {
    expect(buildReceiptLookupNo("SH001", 2026, 6, "0112")).toBe(
      "REC-SH001-202606-0112"
    )
  })

  it("pads short running numbers to four digits", () => {
    expect(buildReceiptLookupNo("SH001", 2026, 6, "12")).toBe(
      "REC-SH001-202606-0012"
    )
  })

  it("returns null when running number is empty", () => {
    expect(buildReceiptLookupNo("SH001", 2026, 6, "")).toBeNull()
  })
})

describe("normalizeReceiptLookupRunningNo", () => {
  it("keeps digits only and limits to four characters", () => {
    expect(normalizeReceiptLookupRunningNo("01ab12xy999")).toBe("0112")
  })
})

describe("defaultRunningNoFromNextPreview", () => {
  it("returns previous sequence when preview matches month", () => {
    expect(
      defaultRunningNoFromNextPreview("REC-SH001-202606-0114", 2026, 6)
    ).toBe("0113")
  })

  it("returns blank when no receipts yet", () => {
    expect(
      defaultRunningNoFromNextPreview("REC-SH001-202606-0001", 2026, 6)
    ).toBe("")
  })

  it("returns blank when preview month does not match", () => {
    expect(
      defaultRunningNoFromNextPreview("REC-SH001-202605-0002", 2026, 6)
    ).toBe("")
  })
})

describe("appendReceiptLookupRunningDigit", () => {
  it("appends digits up to four characters", () => {
    expect(appendReceiptLookupRunningDigit("01", "1")).toBe("011")
  })
})

describe("runningNumbersFromReceiptLookupRows", () => {
  it("returns running-only values in API order without duplicates", () => {
    expect(
      runningNumbersFromReceiptLookupRows([
        { receiptNo: "REC-SH001-202606-0114" },
        { receiptNo: "REC-SH001-202606-0113" },
        { receiptNo: "REC-SH001-202606-0111" },
        { receiptNo: "REC-SH001-202606-0113" },
      ])
    ).toEqual(["0114", "0113", "0111"])
  })
})
