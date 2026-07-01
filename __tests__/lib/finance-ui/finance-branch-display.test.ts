import {
  formatFinanceBranchLabel,
  looksLikeInternalFinanceId,
  resolveFinanceBranchLabel,
  FINANCE_BRANCH_UNASSIGNED_LABEL,
} from "@/lib/finance-ui/finance-branch-display"

describe("finance-branch-display", () => {
  it("formats branch as code • name", () => {
    expect(
      formatFinanceBranchLabel({
        branchCode: "HO999",
        branchName: "Head Office",
      })
    ).toBe("HO999 • Head Office")
  })

  it("detects internal UUID ids", () => {
    expect(
      looksLikeInternalFinanceId("4778631f-a86c-45c4-82cf-09520087ee1a")
    ).toBe(true)
    expect(looksLikeInternalFinanceId("HO999")).toBe(false)
  })

  it("resolves from entry branch fields before override", () => {
    expect(
      resolveFinanceBranchLabel({
        branchCode: "HO999",
        branchName: "Head Office",
        overrideLabel: "SH001 • Shop",
      })
    ).toBe("HO999 • Head Office")
  })

  it("normalizes legacy override separator", () => {
    expect(
      resolveFinanceBranchLabel({
        overrideLabel: "HO999 — Head Office",
      })
    ).toBe("HO999 • Head Office")
  })

  it("never falls back to UUID", () => {
    expect(
      resolveFinanceBranchLabel({
        branchCode: null,
        branchName: null,
        overrideLabel: "4778631f-a86c-45c4-82cf-09520087ee1a",
      })
    ).toBe(FINANCE_BRANCH_UNASSIGNED_LABEL)
  })

  it("rejects UUID mistakenly stored as branch code", () => {
    expect(
      formatFinanceBranchLabel({
        branchCode: "4778631f-a86c-45c4-82cf-09520087ee1a",
        branchName: null,
      })
    ).toBe(FINANCE_BRANCH_UNASSIGNED_LABEL)
  })
})
