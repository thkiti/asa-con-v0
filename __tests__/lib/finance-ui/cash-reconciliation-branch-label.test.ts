import { formatPosSettlementBranchLabel } from "@/lib/finance-ui/pos-settlement-branches"

describe("cash reconciliation branch labels", () => {
  it("formats branch picker labels as branchCode • branchName", () => {
    expect(
      formatPosSettlementBranchLabel({
        code: "B01",
        name: "Main branch",
      })
    ).toBe("B01 • Main branch")
  })
})
