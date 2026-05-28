import {
  buildSnapshotCaptureBody,
  canCaptureSnapshotScope,
  formatSnapshotDisplayTitle,
  formatSnapshotKindLabel,
  formatSnapshotScope,
} from "@/lib/finance-ui/reconciliation-snapshots"
import { formatDateTime } from "@/lib/finance-ui/format"

describe("formatSnapshotScope", () => {
  it("prefers periodKey", () => {
    expect(
      formatSnapshotScope({
        periodKey: "2026-05",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
      })
    ).toBe("2026-05")
  })

  it("formats date range when periodKey missing", () => {
    expect(
      formatSnapshotScope({
        periodKey: null,
        fromDate: "2026-05-01T00:00:00.000Z",
        toDate: "2026-05-31T00:00:00.000Z",
      })
    ).toBe("2026-05-01 → 2026-05-31")
  })
})

describe("formatSnapshotDisplayTitle", () => {
  it("uses label when present", () => {
    expect(
      formatSnapshotDisplayTitle({
        label: "Month-end",
        periodKey: "2026-05",
        fromDate: null,
        toDate: null,
      } as never)
    ).toBe("Month-end")
  })
})

describe("formatSnapshotKindLabel", () => {
  it("maps MANUAL", () => {
    expect(formatSnapshotKindLabel("MANUAL")).toBe("Manual")
  })
})

describe("formatDateTime", () => {
  it("returns em dash for empty values", () => {
    expect(formatDateTime(null)).toBe("—")
  })
})

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
