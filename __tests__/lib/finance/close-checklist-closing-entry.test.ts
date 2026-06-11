import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  buildCloseChecklist,
  resolveCloseReadinessStatus,
} from "@/lib/finance/close-checklist"
import type { CloseChecklistInput } from "@/lib/finance/close-checklist-types"
import type {
  ReconciliationSnapshotHeader,
  SnapshotDashboardRow,
} from "@/lib/finance/reconciliation-snapshot-types"

function snapshotHeader(): ReconciliationSnapshotHeader {
  return {
    id: "snap-1",
    kind: "MANUAL",
    branchId: "branch-1",
    fromDate: "2026-05-01",
    toDate: "2026-05-31",
    periodKey: "2026-05",
    label: null,
    checkedSales: 1,
    checkedStockDocuments: 0,
    issueCount: 0,
    dashboardRowCount: 2,
    matchedCount: 2,
    varianceCount: 0,
    totalVarianceAmount: "0.00",
    payloadVersion: 1,
    createdAt: "2026-05-27T12:00:00.000Z",
    createdByStaffId: "staff-1",
  }
}

function dashboardRows(): SnapshotDashboardRow[] {
  return [
    {
      id: "inv",
      sourceType: "inventory",
      reference: "Inventory",
      branchId: "branch-1",
      periodLabel: "2026-05",
      expectedAmount: "100",
      actualAmount: "100",
      variance: "0",
      status: "MATCHED",
      domain: "inventory",
      raw: {
        domain: "inventory",
        label: "Inventory",
        operationalAmount: "100",
        glAmount: "100",
        variance: "0",
      },
    },
    {
      id: "rev",
      sourceType: "revenue",
      reference: "Revenue",
      branchId: "branch-1",
      periodLabel: "2026-05",
      expectedAmount: "500",
      actualAmount: "500",
      variance: "0",
      status: "MATCHED",
      domain: "revenue",
      raw: {
        domain: "revenue",
        label: "Revenue",
        operationalAmount: "500",
        glAmount: "500",
        variance: "0",
      },
    },
  ]
}

function baseInput(
  closingEntry: CloseChecklistInput["closingEntry"]
): CloseChecklistInput {
  return {
    period: {
      id: "period-1",
      branchId: "branch-1",
      periodKey: "2026-05",
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
    latestSnapshot: snapshotHeader(),
    priorSnapshot: null,
    snapshotPayload: {
      payloadVersion: 1,
      dashboardRows: dashboardRows(),
      issuesPayload: { issues: [] },
      inventoryResult: {},
      salesResult: {},
    },
    closingEntry,
  }
}

describe("close checklist closing entry rules", () => {
  it("blocks when P&L activity exists and no active close", () => {
    const checklist = buildCloseChecklist(
      baseInput({
        isRequired: true,
        currentNetIncome: "400",
        activeEntry: null,
      })
    )

    expect(checklist.items.some((item) => item.id === "closing-entry-missing")).toBe(
      true
    )
    expect(resolveCloseReadinessStatus(checklist.items)).toBe("BLOCKED")
  })

  it("passes when zero P&L and no close", () => {
    const checklist = buildCloseChecklist(
      baseInput({
        isRequired: false,
        currentNetIncome: "0",
        activeEntry: null,
      })
    )

    expect(
      checklist.items.some((item) => item.id === "closing-entry-not-required")
    ).toBe(true)
    expect(checklist.items.some((item) => item.id === "closing-entry-missing")).toBe(
      false
    )
  })

  it("passes when active close matches current net income", () => {
    const checklist = buildCloseChecklist(
      baseInput({
        isRequired: true,
        currentNetIncome: "400",
        activeEntry: { netIncome: "400" },
      })
    )

    expect(checklist.items.some((item) => item.id === "closing-entry-present")).toBe(
      true
    )
    expect(checklist.items.some((item) => item.id === "closing-entry-missing")).toBe(
      false
    )
    expect(checklist.items.some((item) => item.id === "closing-entry-stale")).toBe(
      false
    )
  })

  it("warns when active close net income differs from current P&L", () => {
    const checklist = buildCloseChecklist(
      baseInput({
        isRequired: true,
        currentNetIncome: "500",
        activeEntry: { netIncome: "400" },
      })
    )

    expect(checklist.items.some((item) => item.id === "closing-entry-stale")).toBe(
      true
    )
    expect(resolveCloseReadinessStatus(checklist.items)).toBe("WARNING")
  })
})
