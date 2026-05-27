import {
  periodKeyToSnapshotDateRange,
  validateManualSnapshotScope,
} from "@/lib/finance/reconciliation-snapshot-types"

describe("validateManualSnapshotScope", () => {
  it("accepts fromDate and toDate", () => {
    const from = new Date("2026-05-01T00:00:00.000Z")
    const to = new Date("2026-05-31T00:00:00.000Z")
    const result = validateManualSnapshotScope({
      branchId: "branch-1",
      fromDate: from,
      toDate: to,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.scope.branchId).toBe("branch-1")
      expect(result.scope.fromDate).toEqual(from)
      expect(result.scope.toDate).toEqual(to)
    }
  })

  it("accepts periodKey alone", () => {
    const result = validateManualSnapshotScope({ periodKey: "2026-05" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.scope.periodKey).toBe("2026-05")
    }
  })

  it("rejects missing scope", () => {
    expect(validateManualSnapshotScope({}).ok).toBe(false)
  })

  it("rejects periodKey combined with explicit dates", () => {
    const result = validateManualSnapshotScope({
      periodKey: "2026-05",
      fromDate: new Date("2026-05-01"),
      toDate: new Date("2026-05-31"),
    })
    expect(result.ok).toBe(false)
  })

  it("rejects inverted date range", () => {
    const result = validateManualSnapshotScope({
      fromDate: new Date("2026-05-31"),
      toDate: new Date("2026-05-01"),
    })
    expect(result.ok).toBe(false)
  })
})

describe("periodKeyToSnapshotDateRange", () => {
  it("returns month bounds in UTC", () => {
    const range = periodKeyToSnapshotDateRange("2026-05")
    expect(range).not.toBeNull()
    expect(range!.fromDate.toISOString()).toBe("2026-05-01T00:00:00.000Z")
    expect(range!.toDate.toISOString()).toBe("2026-05-31T00:00:00.000Z")
  })
})