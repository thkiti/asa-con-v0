import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssueVoucherRef,
} from "@/lib/finance/reconciliation-issue-row-types"
import type { SnapshotIssueRow } from "@/lib/finance/reconciliation-snapshot-types"

export type TraceableIssueRow = Pick<
  ReconciliationIssueRow,
  | "id"
  | "sourceType"
  | "sourceId"
  | "documentRef"
  | "issueType"
  | "message"
  | "vouchers"
  | "journalEntries"
  | "sourceCreatedAt"
  | "sourcePostedAt"
>

export type TraceStepKind =
  | "operational"
  | "voucher"
  | "journal"
  | "issue"
  | "evidence"

export type TraceStep = {
  kind: TraceStepKind
  id: string
  label: string
  sortKey: string
  refType?: string
  refId?: string
  voucherNo?: string
  voucherId?: string
  postedAt?: string | null
}

export type TraceEvidenceContext =
  | {
      mode: "live"
    }
  | {
      mode: "snapshot"
      snapshotId: string
      capturedAt?: string
    }

export type FinanceTrace = {
  issueId: string
  sourceType: TraceableIssueRow["sourceType"]
  documentRef: string
  steps: TraceStep[]
}

const STEP_KIND_ORDER: Record<TraceStepKind, number> = {
  operational: 0,
  voucher: 1,
  journal: 2,
  issue: 3,
  evidence: 4,
}

export function buildTraceKey(kind: TraceStepKind, id: string): string {
  return `${kind}:${id}`
}

export function formatFinanceRefType(refType: string): string {
  switch (refType) {
    case FINANCE_REF_TYPES.POS_SALE:
      return "POS sale"
    case FINANCE_REF_TYPES.STOCK_DOC_POST:
      return "Stock document post"
    default:
      return refType.replace(/_/g, " ").toLowerCase()
  }
}

export function formatTraceLabel(step: TraceStep): string {
  switch (step.kind) {
    case "operational":
      return step.label
    case "voucher":
      return step.voucherNo
        ? `Voucher ${step.voucherNo}`
        : `Voucher ${step.id}`
    case "journal":
      return step.voucherNo
        ? `Journal · ${step.voucherNo}`
        : `Journal ${step.id}`
    case "issue":
      return step.label
    case "evidence":
      return step.label
    default:
      return step.label
  }
}

export function sortTraceSteps(steps: readonly TraceStep[]): TraceStep[] {
  return [...steps].sort((left, right) => {
    const kindDiff = STEP_KIND_ORDER[left.kind] - STEP_KIND_ORDER[right.kind]
    if (kindDiff !== 0) {
      return kindDiff
    }
    return left.sortKey.localeCompare(right.sortKey)
  })
}

export function buildOperationalTrace(row: TraceableIssueRow): TraceStep {
  const operationalLabel =
    row.sourceType === "SALE"
      ? `POS sale · ${row.documentRef}`
      : `Stock document · ${row.documentRef}`

  return {
    kind: "operational",
    id: row.sourceId,
    label: operationalLabel,
    sortKey: buildTraceKey("operational", row.sourceId),
    refType: row.sourceType,
    refId: row.sourceId,
    postedAt: row.sourcePostedAt ?? row.sourceCreatedAt,
  }
}

export function buildVoucherTrace(
  voucher: ReconciliationIssueVoucherRef
): TraceStep {
  return {
    kind: "voucher",
    id: voucher.id,
    label: formatTraceLabel({
      kind: "voucher",
      id: voucher.id,
      label: "",
      sortKey: "",
      voucherNo: voucher.voucherNo,
    }),
    sortKey: buildTraceKey("voucher", voucher.voucherNo || voucher.id),
    refType: voucher.refType,
    refId: voucher.refId,
    voucherNo: voucher.voucherNo,
    postedAt: voucher.postedAt,
  }
}

export function buildJournalTrace(
  journal: ReconciliationIssueJournalRef,
  voucherNo?: string
): TraceStep {
  return {
    kind: "journal",
    id: journal.id,
    label: voucherNo ? `Journal · ${voucherNo}` : `Journal ${journal.id}`,
    sortKey: buildTraceKey("journal", journal.id),
    voucherId: journal.voucherId,
    voucherNo,
    postedAt: journal.postedAt,
  }
}

function buildIssueStep(row: TraceableIssueRow): TraceStep {
  return {
    kind: "issue",
    id: row.id,
    label: row.issueType.replace(/_/g, " "),
    sortKey: buildTraceKey("issue", row.id),
    refType: row.sourceType,
    refId: row.sourceId,
  }
}

function buildEvidenceStep(context: TraceEvidenceContext): TraceStep {
  if (context.mode === "snapshot") {
    return {
      kind: "evidence",
      id: context.snapshotId,
      label: "Snapshot evidence",
      sortKey: buildTraceKey("evidence", context.snapshotId),
      refType: "SNAPSHOT",
      refId: context.snapshotId,
      postedAt: context.capturedAt ?? null,
    }
  }

  return {
    kind: "evidence",
    id: "live-reconciliation",
    label: "Live reconciliation evidence",
    sortKey: buildTraceKey("evidence", "live-reconciliation"),
    refType: "LIVE_RECONCILIATION",
    refId: "live-reconciliation",
  }
}

function sortVoucherRefs(
  vouchers: readonly ReconciliationIssueVoucherRef[]
): ReconciliationIssueVoucherRef[] {
  return [...vouchers].sort((left, right) =>
    (left.voucherNo || left.id).localeCompare(right.voucherNo || right.id)
  )
}

function sortJournalRefs(
  journals: readonly ReconciliationIssueJournalRef[]
): ReconciliationIssueJournalRef[] {
  return [...journals].sort((left, right) => left.id.localeCompare(right.id))
}

export function buildFinanceTrace(
  row: TraceableIssueRow,
  context?: TraceEvidenceContext
): FinanceTrace {
  const sortedVouchers = sortVoucherRefs(row.vouchers)
  const voucherNoById = new Map(
    sortedVouchers.map((voucher) => [voucher.id, voucher.voucherNo])
  )

  const steps: TraceStep[] = [
    buildOperationalTrace(row),
    ...sortedVouchers.map(buildVoucherTrace),
    ...sortJournalRefs(row.journalEntries).map((journal) =>
      buildJournalTrace(journal, voucherNoById.get(journal.voucherId))
    ),
    buildIssueStep(row),
  ]

  if (context) {
    steps.push(buildEvidenceStep(context))
  }

  return {
    issueId: row.id,
    sourceType: row.sourceType,
    documentRef: row.documentRef,
    steps: sortTraceSteps(steps),
  }
}

export function buildSnapshotIssueTrace(
  row: SnapshotIssueRow | TraceableIssueRow,
  context: {
    snapshotId: string
    capturedAt?: string
  }
): FinanceTrace {
  return buildFinanceTrace(row, {
    mode: "snapshot",
    snapshotId: context.snapshotId,
    capturedAt: context.capturedAt,
  })
}

export function toTraceableIssueRow(
  row: ReconciliationIssueRow | SnapshotIssueRow
): TraceableIssueRow {
  return row
}
