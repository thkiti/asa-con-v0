import {
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
