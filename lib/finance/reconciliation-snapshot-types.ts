import type { ReconciliationSnapshotKind } from "@/generated/prisma/client"
import type {
  InventoryReconciliationResult,
  ReconciliationIssueType,
  ReconciliationVariance,
  SalesReconciliationResult,
} from "./reconciliation-types"

export const RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION = 1 as const

export type ReconciliationSnapshotPayloadVersion =
  typeof RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION

export type ReconciliationSnapshotRowStatus =
  | "MATCHED"
  | "VARIANCE"
  | "MISSING_SOURCE"
  | "MISSING_GL"

export type SnapshotDashboardRow = {
  id: string
  sourceType: string
  reference: string
  branchId: string
  periodLabel: string
  expectedAmount: string
  actualAmount: string
  variance: string
  status: ReconciliationSnapshotRowStatus
  varianceReason?: string
  varianceType?: string
  domain: string
  raw: ReconciliationVariance
}

export type SnapshotIssueVoucherRef = {
  id: string
  voucherNo: string
  refType: string
  refId: string
  postedAt: string | null
}

export type SnapshotIssueJournalRef = {
  id: string
  voucherId: string
  postedAt: string
}

export type SnapshotIssueRow = {
  id: string
  sourceType: "SALE" | "STOCK_DOCUMENT" | "REFUND"
  sourceId: string
  documentRef: string
  issueType: ReconciliationIssueType
  severity: "ERROR" | "WARNING"
  status: ReconciliationSnapshotRowStatus
  message: string
  expectedAmount: number | null
  actualAmount: number | null
  difference: number | null
  vouchers: SnapshotIssueVoucherRef[]
  journalEntries: SnapshotIssueJournalRef[]
  sourceCreatedAt: string | null
  sourcePostedAt: string | null
}

export type SnapshotIssuesPayload = {
  filter: {
    branchId?: string
    from?: string
    to?: string
  }
  checkedSales: number
  checkedStockDocuments: number
  checkedRefunds: number
  issueCount: number
  issues: SnapshotIssueRow[]
}

export type ReconciliationSnapshotPayloadV1 = {
  inventoryResult: InventoryReconciliationResult
  salesResult: SalesReconciliationResult
  dashboardRows: SnapshotDashboardRow[]
  issuesPayload: SnapshotIssuesPayload
}

export type ManualSnapshotScopeInput = {
  branchId?: string
  fromDate?: Date
  toDate?: Date
  periodKey?: string
  label?: string
  note?: string
}

export type ResolvedManualSnapshotScope = {
  branchId?: string
  fromDate: Date
  toDate: Date
  periodKey?: string
  label?: string
  note?: string
}

export type ManualSnapshotScopeValidationResult =
  | { ok: true; scope: ResolvedManualSnapshotScope }
  | { ok: false; code: "INVALID_SCOPE"; message: string }

import { normalizeAccountingPeriodKey } from "./period-key"

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

export function periodKeyToSnapshotDateRange(periodKey: string): {
  fromDate: Date
  toDate: Date
} | null {
  const trimmed = normalizeAccountingPeriodKey(periodKey) ?? periodKey.trim()
  if (!PERIOD_KEY_PATTERN.test(trimmed)) {
    return null
  }
  const [yearStr, monthStr] = trimmed.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || month < 1 || month > 12) {
    return null
  }
  const fromDate = new Date(Date.UTC(year, month - 1, 1))
  const toDate = new Date(Date.UTC(year, month, 0))
  return { fromDate, toDate }
}

export function validateManualSnapshotScope(
  input: ManualSnapshotScopeInput
): ManualSnapshotScopeValidationResult {
  const periodKey = input.periodKey?.trim()
  const fromDate = input.fromDate
  const toDate = input.toDate

  if (periodKey) {
    const range = periodKeyToSnapshotDateRange(periodKey)
    if (!range) {
      return {
        ok: false,
        code: "INVALID_SCOPE",
        message: "periodKey must be YYYY-MM",
      }
    }
    if (fromDate || toDate) {
      return {
        ok: false,
        code: "INVALID_SCOPE",
        message: "Use either periodKey or fromDate+toDate, not both",
      }
    }
    return {
      ok: true,
      scope: {
        branchId: input.branchId?.trim() || undefined,
        fromDate: range.fromDate,
        toDate: range.toDate,
        periodKey,
        label: input.label?.trim() || undefined,
        note: input.note?.trim() || undefined,
      },
    }
  }

  if (!fromDate || !toDate) {
    return {
      ok: false,
      code: "INVALID_SCOPE",
      message: "fromDate and toDate are required when periodKey is omitted",
    }
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return {
      ok: false,
      code: "INVALID_SCOPE",
      message: "fromDate must not be after toDate",
    }
  }

  return {
    ok: true,
    scope: {
      branchId: input.branchId?.trim() || undefined,
      fromDate,
      toDate,
      label: input.label?.trim() || undefined,
      note: input.note?.trim() || undefined,
    },
  }
}

export type ReconciliationSnapshotHeader = {
  id: string
  kind: ReconciliationSnapshotKind
  branchId: string | null
  fromDate: string | null
  toDate: string | null
  periodKey: string | null
  label: string | null
  checkedSales: number
  checkedStockDocuments: number
  issueCount: number
  dashboardRowCount: number
  matchedCount: number
  varianceCount: number
  totalVarianceAmount: string
  payloadVersion: number
  createdAt: string
  createdByStaffId: string
}

export type ReconciliationSnapshotDetail = ReconciliationSnapshotHeader & {
  note: string | null
  payload: ReconciliationSnapshotPayloadV1
}