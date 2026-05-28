import type {
  Prisma,
  PrismaClient,
  ReconciliationSnapshot,
} from "@/generated/prisma/client"
import { toMoney } from "./decimal"
import { formatDateOnly } from "./reconciliation-dashboard-rows"
import {
  captureReconciliationSnapshotPayload,
  type ReconciliationSnapshotCapturePrisma,
} from "./reconciliation-snapshot-capture"
import { ReconciliationSnapshotError } from "./reconciliation-snapshot-errors"
import {
  RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
  validateManualSnapshotScope,
  type ManualSnapshotScopeInput,
  type ReconciliationSnapshotDetail,
  type ReconciliationSnapshotHeader,
  type ReconciliationSnapshotPayloadV1,
} from "./reconciliation-snapshot-types"
import { summarizeSnapshotDashboardRows } from "./reconciliation-dashboard-rows"
import { resolveBranchId, type BranchLookupPrisma } from "./resolve-branch-id"

export type ReconciliationSnapshotPrisma = Pick<
  PrismaClient,
  "reconciliationSnapshot"
>

export type ReconciliationSnapshotServicePrisma =
  ReconciliationSnapshotPrisma &
    ReconciliationSnapshotCapturePrisma &
    BranchLookupPrisma

export type ReconciliationSnapshotListPrisma =
  ReconciliationSnapshotPrisma & BranchLookupPrisma

export type ReconciliationSnapshotListFilter = {
  branchId?: string
  limit?: number
}

export type ReconciliationSnapshotPeriodFilter = {
  branchId: string
  periodKey: string
  limit?: number
}

export type SnapshotsForPeriodResult = {
  latest: ReconciliationSnapshotDetail | null
  prior: ReconciliationSnapshotHeader | null
}

const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 100

function clampListLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_LIST_LIMIT
  }
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIST_LIMIT)
}

function toSnapshotHeader(
  row: ReconciliationSnapshot
): ReconciliationSnapshotHeader {
  return {
    id: row.id,
    kind: row.kind,
    branchId: row.branchId,
    fromDate: row.fromDate ? formatDateOnly(row.fromDate) : null,
    toDate: row.toDate ? formatDateOnly(row.toDate) : null,
    periodKey: row.periodKey,
    label: row.label,
    checkedSales: row.checkedSales,
    checkedStockDocuments: row.checkedStockDocuments,
    issueCount: row.issueCount,
    dashboardRowCount: row.dashboardRowCount,
    matchedCount: row.matchedCount,
    varianceCount: row.varianceCount,
    totalVarianceAmount: row.totalVarianceAmount.toString(),
    payloadVersion: row.payloadVersion,
    createdAt: row.createdAt.toISOString(),
    createdByStaffId: row.createdByStaffId,
  }
}

function toSnapshotPayload(row: ReconciliationSnapshot): ReconciliationSnapshotPayloadV1 {
  return {
    inventoryResult:
      row.inventoryResult as ReconciliationSnapshotPayloadV1["inventoryResult"],
    salesResult: row.salesResult as ReconciliationSnapshotPayloadV1["salesResult"],
    dashboardRows:
      row.dashboardRows as ReconciliationSnapshotPayloadV1["dashboardRows"],
    issuesPayload:
      row.issuesPayload as ReconciliationSnapshotPayloadV1["issuesPayload"],
  }
}

function toSnapshotDetail(row: ReconciliationSnapshot): ReconciliationSnapshotDetail {
  return {
    ...toSnapshotHeader(row),
    note: row.note,
    payload: toSnapshotPayload(row),
  }
}

export async function createManualSnapshot(
  prisma: ReconciliationSnapshotServicePrisma,
  input: ManualSnapshotScopeInput & { createdByStaffId: string }
): Promise<ReconciliationSnapshotDetail> {
  const validation = validateManualSnapshotScope(input)
  if (!validation.ok) {
    throw new ReconciliationSnapshotError(validation.message, validation.code)
  }

  const scope = validation.scope
  const resolvedBranchId = await resolveBranchId(prisma, scope.branchId)
  const resolvedScope = { ...scope, branchId: resolvedBranchId }

  const payload = await captureReconciliationSnapshotPayload(prisma, resolvedScope)
  const summary = summarizeSnapshotDashboardRows(payload.dashboardRows)

  const row = await prisma.reconciliationSnapshot.create({
    data: {
      kind: "MANUAL",
      branchId: resolvedBranchId,
      fromDate: scope.fromDate,
      toDate: scope.toDate,
      periodKey: scope.periodKey,
      label: scope.label,
      note: scope.note,
      checkedSales: payload.issuesPayload.checkedSales,
      checkedStockDocuments: payload.issuesPayload.checkedStockDocuments,
      issueCount: payload.issuesPayload.issueCount,
      dashboardRowCount: payload.dashboardRows.length,
      matchedCount: summary.matchedCount,
      varianceCount: summary.varianceCount,
      totalVarianceAmount: toMoney(summary.totalVarianceAmount),
      payloadVersion: RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
      inventoryResult: payload.inventoryResult as Prisma.InputJsonValue,
      salesResult: payload.salesResult as Prisma.InputJsonValue,
      dashboardRows: payload.dashboardRows as Prisma.InputJsonValue,
      issuesPayload: payload.issuesPayload as Prisma.InputJsonValue,
      createdByStaffId: input.createdByStaffId,
    },
  })

  return toSnapshotDetail(row)
}

export async function listReconciliationSnapshots(
  prisma: ReconciliationSnapshotListPrisma,
  filter: ReconciliationSnapshotListFilter = {}
): Promise<ReconciliationSnapshotHeader[]> {
  const branchId = await resolveBranchId(prisma, filter.branchId)
  const limit = clampListLimit(filter.limit)

  const rows = await prisma.reconciliationSnapshot.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return rows.map(toSnapshotHeader)
}


function clampPeriodSnapshotLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 2
  }
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIST_LIMIT)
}

export async function findSnapshotsForPeriod(
  prisma: ReconciliationSnapshotListPrisma,
  filter: ReconciliationSnapshotPeriodFilter
): Promise<SnapshotsForPeriodResult> {
  const branchId = await resolveBranchId(prisma, filter.branchId)
  const periodKey = filter.periodKey.trim()
  const take = clampPeriodSnapshotLimit(filter.limit)

  const rows = await prisma.reconciliationSnapshot.findMany({
    where: {
      branchId,
      periodKey,
    },
    orderBy: { createdAt: "desc" },
    take,
  })

  if (rows.length === 0) {
    return { latest: null, prior: null }
  }

  return {
    latest: toSnapshotDetail(rows[0]),
    prior: rows.length > 1 ? toSnapshotHeader(rows[1]) : null,
  }
}
export async function getReconciliationSnapshotById(
  prisma: ReconciliationSnapshotPrisma,
  id: string
): Promise<ReconciliationSnapshotDetail> {
  const row = await prisma.reconciliationSnapshot.findUnique({
    where: { id },
  })

  if (!row) {
    throw new ReconciliationSnapshotError(
      `Reconciliation snapshot not found: ${id}`,
      "NOT_FOUND"
    )
  }

  return toSnapshotDetail(row)
}
