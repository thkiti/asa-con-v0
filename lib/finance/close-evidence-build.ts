import type { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { CloseGatePolicy } from "./close-gate-policy"
import type {
  CloseChecklistIssueSummary,
  CloseChecklistResult,
  CloseChecklistSnapshotRef,
} from "./close-checklist-types"
import { summarizeSnapshotIssues } from "./close-checklist"
import {
  CLOSE_EVIDENCE_PAYLOAD_VERSION,
  type CloseActorSnapshot,
  type CloseEvidenceFinancialTotals,
  type CloseEvidencePayloadV1,
} from "./close-evidence-types"
import type {
  ReconciliationSnapshotPayloadV1,
  SnapshotIssueRow,
} from "./reconciliation-snapshot-types"
import type {
  InventoryReconciliationResult,
  SalesReconciliationResult,
} from "./reconciliation-types"

export const DEFAULT_CLOSE_GATE_POLICY_KEY = "default"

export function serializeCloseGatePolicyKey(_policy: CloseGatePolicy): string {
  return DEFAULT_CLOSE_GATE_POLICY_KEY
}

function extractFinancialTotals(
  payload: ReconciliationSnapshotPayloadV1 | null | undefined
): CloseEvidenceFinancialTotals {
  if (!payload) {
    return {
      operationalInventoryValue: null,
      glInventoryBalance: null,
      operationalRevenue: null,
      glRevenueBalance: null,
    }
  }

  const inventory = payload.inventoryResult as InventoryReconciliationResult
  const sales = payload.salesResult as SalesReconciliationResult

  return {
    operationalInventoryValue: inventory.operationalTotalValue ?? null,
    glInventoryBalance: inventory.glInventoryBalance ?? null,
    operationalRevenue: sales.operationalRevenue ?? null,
    glRevenueBalance: sales.glRevenueBalance ?? null,
  }
}

function resolveIssueSummary(
  snapshotIssues: SnapshotIssueRow[] | undefined
): CloseChecklistIssueSummary {
  if (!snapshotIssues?.length) {
    return {
      totalCount: 0,
      missingGlCount: 0,
      missingSourceCount: 0,
      varianceStatusCount: 0,
      errorSeverityCount: 0,
    }
  }
  return summarizeSnapshotIssues(snapshotIssues)
}

export function buildCloseEvidencePayload(input: {
  period: {
    id: string
    branchId: string
    periodKey: string
    statusBefore: AccountingPeriodStatus
    openedAt: Date
  }
  closedAt: Date
  actor: CloseActorSnapshot
  policy: CloseGatePolicy
  checklist: CloseChecklistResult
  priorSnapshotRef: CloseChecklistSnapshotRef | null
  snapshotPayload: ReconciliationSnapshotPayloadV1 | null
}): CloseEvidencePayloadV1 {
  const closedAtIso = input.closedAt.toISOString()
  const issueSummary = resolveIssueSummary(
    input.snapshotPayload?.issuesPayload.issues
  )

  return {
    payloadVersion: CLOSE_EVIDENCE_PAYLOAD_VERSION,
    period: {
      id: input.period.id,
      branchId: input.period.branchId,
      periodKey: input.period.periodKey,
      statusBefore: input.period.statusBefore,
      statusAfter: "HARD_CLOSED",
      openedAt: input.period.openedAt.toISOString(),
      closedAt: closedAtIso,
    },
    close: {
      mode: "HARD",
      closedAt: closedAtIso,
      closedByStaffId: input.actor.closedByStaffId,
      closedByName: input.actor.closedByName,
      closedByRole: input.actor.closedByRole,
    },
    gate: {
      policyKey: serializeCloseGatePolicyKey(input.policy),
      rejectBlocked: input.policy.rejectBlocked,
      rejectWarnings: input.policy.rejectWarnings,
    },
    checklist: {
      status: input.checklist.status,
      blockerCount: input.checklist.blockerCount,
      warningCount: input.checklist.warningCount,
      items: input.checklist.items.map((item) => ({
        id: item.id,
        group: item.group,
        severity: item.severity,
        title: item.title,
      })),
    },
    reconciliationSummary: input.checklist.metrics,
    financialTotals: extractFinancialTotals(input.snapshotPayload),
    traceabilityRefs: {
      reconciliationSnapshotId: input.checklist.latestSnapshotRef?.id ?? null,
      priorSnapshotId: input.priorSnapshotRef?.id ?? null,
      latestSnapshotRef: input.checklist.latestSnapshotRef,
      priorSnapshotRef: input.priorSnapshotRef,
      compareDriftDetected: input.checklist.metrics.compareDriftDetected,
      issueSummary,
    },
  }
}
