import { applyReportBranchScope } from "@/lib/finance/reports/report-branch-scope"

function makeDb() {
  return {
    branch: { findFirst: jest.fn() },
  }
}

describe("applyReportBranchScope", () => {
  it("resolves branch code to Branch.id before report query", async () => {
    const db = makeDb()
    db.branch.findFirst.mockResolvedValue({ id: "branch-ho999-internal" })

    const scoped = await applyReportBranchScope(db as never, {
      legalEntityCode: "AD",
      branchId: "HO999",
      periodKey: "2026-01",
    })

    expect(scoped.branchId).toBe("branch-ho999-internal")
    expect(db.branch.findFirst).toHaveBeenCalled()
  })

  it("passes through when branch filter is omitted", async () => {
    const db = makeDb()

    const scoped = await applyReportBranchScope(db as never, {
      legalEntityCode: "AS",
      periodKey: "2026-01",
    })

    expect(scoped.branchId).toBeUndefined()
    expect(db.branch.findFirst).not.toHaveBeenCalled()
  })
})
