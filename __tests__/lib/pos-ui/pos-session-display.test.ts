import {
  formatBranchDisplay,
  formatReceiptDisplay,
  formatStaffDisplay,
  resolvePosReceiptPanelNo,
} from "@/lib/pos-ui/pos-session-display"

describe("pos-session-display", () => {
  it("formatBranchDisplay", () => {
    expect(formatBranchDisplay("SH001", "Chidlom")).toBe("SH001 • Chidlom")
  })

  it("formatStaffDisplay", () => {
    expect(formatStaffDisplay("103", "Somsak Kamnuch")).toBe("103 • Somsak Kamnuch")
  })

  it("formatReceiptDisplay", () => {
    expect(formatReceiptDisplay(null)).toBe("-")
    expect(formatReceiptDisplay("")).toBe("-")
    expect(formatReceiptDisplay("REC-SH001-202606-0001")).toBe(
      "REC-SH001-202606-0001"
    )
  })

  it("resolvePosReceiptPanelNo prefers last allocated over preview", () => {
    expect(
      resolvePosReceiptPanelNo("REC-SH001-202606-0001", "REC-SH001-202606-0002")
    ).toBe("REC-SH001-202606-0001")
    expect(resolvePosReceiptPanelNo(null, "REC-SH001-202606-0001")).toBe(
      "REC-SH001-202606-0001"
    )
    expect(resolvePosReceiptPanelNo(null, null)).toBeNull()
  })
})
