import {
  buildSnapshotCaptureBody,
  canCaptureSnapshotScope,
} from "@/lib/finance-ui/reconciliation-snapshots"

describe("canCaptureSnapshotScope", () => {
  it("returns true for valid periodKey", () => {
    expect(canCaptureSnapshotScope({ periodKey: "2026-05" })).toBe(true)
  })

  it("returns false for invalid periodKey without from/to", () => {
    expect(canCaptureSnapshotScope({ periodKey: "bad" })).toBe(false)
  })

  it("returns true for from+to via buildApiFilter", () => {
    expect(
      canCaptureSnapshotScope({
        from: "2026-05-01",
        to: "2026-05-31",
      })
    ).toBe(true)
  })

  it("returns false when only from is set", () => {
    expect(canCaptureSnapshotScope({ from: "2026-05-01" })).toBe(false)
  })
})

describe("buildSnapshotCaptureBody", () => {
  it("sends periodKey alone when valid", () => {
    expect(
      buildSnapshotCaptureBody(
        { branchId: " branch-1 ", periodKey: "2026-05", from: "2026-01-01" },
        { label: " Month-end ", note: " review " }
      )
    ).toEqual({
      branchId: "branch-1",
      periodKey: "2026-05",
      label: "Month-end",
      note: "review",
    })
  })

  it("sends from+to when periodKey is absent", () => {
    expect(
      buildSnapshotCaptureBody({
        branchId: "branch-1",
        from: "2026-05-01",
        to: "2026-05-31",
      })
    ).toEqual({
      branchId: "branch-1",
      from: "2026-05-01",
      to: "2026-05-31",
    })
  })

  it("does not include both periodKey and from/to", () => {
    const body = buildSnapshotCaptureBody({ periodKey: "2026-05" })
    expect(body.periodKey).toBe("2026-05")
    expect(body.from).toBeUndefined()
    expect(body.to).toBeUndefined()
  })
})
