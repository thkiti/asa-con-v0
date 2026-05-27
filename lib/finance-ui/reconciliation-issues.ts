import type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssueRowStatus,
  ReconciliationIssuesFilter,
  ReconciliationIssuesResult,
  ReconciliationIssueVoucherRef,
} from "@/lib/finance/reconciliation-issue-row-types"
import {
  deriveIssueStatus,
  filterIssueRows,
  issueMatchesDomain,
} from "@/lib/finance/reconciliation-issue-row-filters"
import type { ReconciliationIssueType } from "@/lib/finance/reconciliation-types"

export type ReconciliationRowStatus = ReconciliationIssueRowStatus

export type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssuesFilter,
  ReconciliationIssuesResult,
  ReconciliationIssueType,
  ReconciliationIssueVoucherRef,
}

export { deriveIssueStatus, filterIssueRows, issueMatchesDomain }

export function buildIssuesQuery(filter: ReconciliationIssuesFilter): string {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) {
    params.set("branchId", filter.branchId.trim())
  }
  if (filter.from?.trim()) {
    params.set("from", filter.from.trim())
  }
  if (filter.to?.trim()) {
    params.set("to", filter.to.trim())
  }
  if (filter.sourceType) {
    params.set("sourceType", filter.sourceType)
  }
  if (filter.status) {
    params.set("status", filter.status)
  }
  if (filter.domain?.trim()) {
    params.set("domain", filter.domain.trim())
  }
  if (filter.issueType) {
    params.set("issueType", filter.issueType)
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function issuesToCsv(rows: ReconciliationIssueRow[]): string {
  const header = [
    "sourceType",
    "documentRef",
    "issueType",
    "status",
    "expectedAmount",
    "actualAmount",
    "difference",
    "message",
  ]
  const lines = rows.map((row) =>
    [
      row.sourceType,
      row.documentRef,
      row.issueType,
      row.status,
      row.expectedAmount ?? "",
      row.actualAmount ?? "",
      row.difference ?? "",
      row.message,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  )
  return [header.join(","), ...lines].join("\n")
}
