import {
  buildSnapshotCaptureBody,
  canCaptureSnapshotScope,
  formatSnapshotDisplayTitle,
  formatSnapshotKindLabel,
  formatSnapshotScope,
  compareSnapshotHeaderMetrics,
  diffDashboardRows,
  diffSnapshotIssues,
  formatAmountDelta,
  formatCountDelta,
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


describe("formatCountDelta", () => {
  it("formats positive and negative deltas", () => {
    expect(formatCountDelta(0)).toBe("0")
    expect(formatCountDelta(2)).toBe("+2")
    expect(formatCountDelta(-1)).toBe("-1")
  })
})

describe("formatAmountDelta", () => {
  it("formats monetary delta", () => {
    expect(formatAmountDelta(10)).toBe("+10.00")
    expect(formatAmountDelta(-5.5)).toBe("-5.50")
  })
})

describe("compareSnapshotHeaderMetrics", () => {
  it("computes right minus left deltas", () => {
    const left = {
      matchedCount: 1,
      varianceCount: 2,
      issueCount: 3,
      dashboardRowCount: 4,
      totalVarianceAmount: "10.00",
    } as never
    const right = {
      matchedCount: 2,
      varianceCount: 1,
      issueCount: 4,
      dashboardRowCount: 4,
      totalVarianceAmount: "15.00",
    } as never

    const metrics = compareSnapshotHeaderMetrics(left, right)
    expect(metrics.matchedCount.delta).toBe(1)
    expect(metrics.varianceCount.delta).toBe(-1)
    expect(metrics.issueCount.delta).toBe(1)
    expect(metrics.totalVarianceAmount.delta).toBe(5)
  })
})

describe("diffDashboardRows", () => {
  it("classifies added removed and changed rows", () => {
    const baseRow = {
      id: "inventory:Inventory total",
      sourceType: "Inventory",
      reference: "Inventory total",
      branchId: "branch-1",
      periodLabel: "2026-05",
      expectedAmount: "100",
      actualAmount: "90",
      variance: "10",
      status: "VARIANCE",
      domain: "inventory",
      raw: {} as never,
    }

    const diffs = diffDashboardRows(
      [baseRow],
      [
        { ...baseRow, status: "MATCHED", variance: "0", actualAmount: "100" },
        {
          ...baseRow,
          id: "revenue:POS",
          reference: "POS revenue",
          domain: "revenue",
        },
      ]
    )

    expect(diffs.find((d) => d.id === "inventory:Inventory total")?.kind).toBe(
      "changed"
    )
    expect(diffs.find((d) => d.id === "revenue:POS")?.kind).toBe("added")
  })
})

describe("diffSnapshotIssues", () => {
  it("detects added and removed issues by id", () => {
    const issue = {
      id: "STOCK_DOCUMENT:doc-1:INVENTORY_VALUE_MISMATCH",
      sourceType: "STOCK_DOCUMENT",
      sourceId: "doc-1",
      documentRef: "doc-1",
      issueType: "INVENTORY_VALUE_MISMATCH",
      severity: "ERROR",
      status: "VARIANCE",
      message: "Mismatch",
      expectedAmount: 100,
      actualAmount: 90,
      difference: 10,
      vouchers: [],
      journalEntries: [],
      sourceCreatedAt: null,
      sourcePostedAt: null,
    }

    const diffs = diffSnapshotIssues([issue], [])
    expect(diffs[0]?.kind).toBe("removed")
  })
})
