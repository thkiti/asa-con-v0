import type { PrismaClient } from "@/generated/prisma/client"
import {
  formatDateOnly,
  formatSnapshotPeriodLabel,
  toSnapshotDashboardRows,
  varianceRowsFromResults,
} from "./reconciliation-dashboard-rows"
import { buildReconciliationIssuesResult } from "./reconciliation-issue-rows"
import {
  reconcileInventory,
  reconcileSalesAndTender,
  type ReconciliationPrisma,
} from "./reconciliation"
import type {
  ReconciliationSnapshotPayloadV1,
  ResolvedManualSnapshotScope,
  SnapshotIssueRow,
  SnapshotIssuesPayload,
} from "./reconciliation-snapshot-types"

export type ReconciliationSnapshotCapturePrisma = ReconciliationPrisma &
  Pick<PrismaClient, "sale" | "stockDocument" | "voucher">

function scopeToDateFilter(scope: ResolvedManualSnapshotScope) {
  return {
    branchId: scope.branchId,
    from: formatDateOnly(scope.fromDate),
    to: formatDateOnly(scope.toDate),
  }
}

function toSnapshotIssueRows(
  issues: Awaited<ReturnType<typeof buildReconciliationIssuesResult>>["issues"]
): SnapshotIssueRow[] {
  return issues.map((issue) => ({ ...issue }))
}

export async function captureReconciliationSnapshotPayload(
  prisma: ReconciliationSnapshotCapturePrisma,
  scope: ResolvedManualSnapshotScope
): Promise<ReconciliationSnapshotPayloadV1> {
  const dateFilter = scopeToDateFilter(scope)
  const reconciliationFilter = {
    branchId: scope.branchId,
    from: scope.fromDate,
    to: scope.toDate,
  }

  const [inventoryResult, salesResult, issuesResult] = await Promise.all([
    reconcileInventory(prisma, reconciliationFilter),
    reconcileSalesAndTender(prisma, reconciliationFilter),
    buildReconciliationIssuesResult(prisma, dateFilter),
  ])

  const mergedVariances = varianceRowsFromResults({
    inventory: inventoryResult,
    sales: salesResult,
  })
  const periodLabel = formatSnapshotPeriodLabel(scope)
  const dashboardRows = toSnapshotDashboardRows({
    rows: mergedVariances,
    branchId: scope.branchId,
    periodLabel,
  })

  const issuesPayload: SnapshotIssuesPayload = {
    filter: {
      branchId: dateFilter.branchId,
      from: dateFilter.from,
      to: dateFilter.to,
    },
    checkedSales: issuesResult.checkedSales,
    checkedStockDocuments: issuesResult.checkedStockDocuments,
    checkedRefunds: issuesResult.checkedRefunds,
    issueCount: issuesResult.issues.length,
    issues: toSnapshotIssueRows(issuesResult.issues),
  }

  return {
    inventoryResult,
    salesResult,
    dashboardRows,
    issuesPayload,
  }
}
