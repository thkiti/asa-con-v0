import {
  branchListMachineNoDisplay,
  branchListTaxIdDisplay,
  branchTaxIdFieldLabel,
  previewBranchCodeForTaxLabel,
} from "@/lib/master/parse-branch-contact"

describe("branchTaxIdFieldLabel", () => {
  it("uses Company Tax ID for HO999", () => {
    expect(branchTaxIdFieldLabel("HO999")).toBe("Company Tax ID")
    expect(branchTaxIdFieldLabel(" ho999 ")).toBe("Company Tax ID")
  })

  it("uses Machine / POS Approval ID for shop branches", () => {
    expect(branchTaxIdFieldLabel("SH001")).toBe("Machine / POS Approval ID")
    expect(branchTaxIdFieldLabel("SH002")).toBe("Machine / POS Approval ID")
  })
})

describe("previewBranchCodeForTaxLabel", () => {
  it("pads numeric shop codes like create normalization", () => {
    expect(previewBranchCodeForTaxLabel("2", "SH")).toBe("SH002")
  })

  it("returns SH when code empty", () => {
    expect(previewBranchCodeForTaxLabel("", "SH")).toBe("SH")
  })
})

describe("branch list tax / machine columns", () => {
  it("shows tax ID for HO only", () => {
    expect(branchListTaxIdDisplay({ type: "HO", taxId: "0123456789012" })).toBe(
      "0123456789012"
    )
    expect(branchListTaxIdDisplay({ type: "SH", taxId: "M-001" })).toBe("")
  })

  it("shows machine no for SH only", () => {
    expect(branchListMachineNoDisplay({ type: "SH", taxId: "M-001" })).toBe("M-001")
    expect(branchListMachineNoDisplay({ type: "HO", taxId: "0123456789012" })).toBe("")
  })
})
