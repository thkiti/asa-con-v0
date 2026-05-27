import { resolveBranchId } from "@/lib/finance/resolve-branch-id"
import { ReconciliationSnapshotError } from "@/lib/finance/reconciliation-snapshot-errors"

function makeDb() {
  return {
    branch: { findFirst: jest.fn() },
  }
}

describe("resolveBranchId", () => {
  it("returns undefined when branch key is omitted", async () => {
    const db = makeDb()
    await expect(resolveBranchId(db as never)).resolves.toBeUndefined()
    expect(db.branch.findFirst).not.toHaveBeenCalled()
  })

  it("resolves Branch.id directly", async () => {
    const db = makeDb()
    db.branch.findFirst.mockResolvedValue({ id: "uuid-1" })

    await expect(resolveBranchId(db as never, "uuid-1")).resolves.toBe("uuid-1")
    expect(db.branch.findFirst).toHaveBeenCalledWith({
      where: {
        deleted: false,
        isActive: true,
        OR: [{ id: "uuid-1" }, { code: "uuid-1" }],
      },
      select: { id: true },
    })
  })

  it("resolves Branch.code to Branch.id", async () => {
    const db = makeDb()
    db.branch.findFirst.mockResolvedValue({ id: "uuid-sh001" })

    await expect(resolveBranchId(db as never, "SH001")).resolves.toBe("uuid-sh001")
  })

  it("throws BRANCH_NOT_FOUND when branch is missing", async () => {
    const db = makeDb()
    db.branch.findFirst.mockResolvedValue(null)

    await expect(resolveBranchId(db as never, "NOPE")).rejects.toMatchObject({
      code: "BRANCH_NOT_FOUND",
      message: "Branch not found: NOPE",
    })
  })
})
