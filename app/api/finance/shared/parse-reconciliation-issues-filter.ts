import type { ReconciliationIssueType } from "@/lib/finance-ui/reconciliation-issues"
import type { ReconciliationRowStatus } from "@/lib/finance-ui/reconciliation"
import type { ReconciliationIssuesFilter } from "@/lib/finance-ui/reconciliation-issues"
import { parseReconciliationFilter } from "./parse-finance-filter"

export type ReconciliationIssuesFilterParams = {
  get(name: string): string | null
}

const SOURCE_TYPES = new Set(["SALE", "STOCK_DOCUMENT"])
const STATUSES = new Set<ReconciliationRowStatus>([
  "MATCHED",
  "VARIANCE",
  "MISSING_SOURCE",
  "MISSING_GL",
])
const ISSUE_TYPES = new Set<ReconciliationIssueType>([
  "MISSING_VOUCHER",
  "DUPLICATE_VOUCHER",
  "TOTAL_MISMATCH",
  "MISSING_COGS_LINES",
  "INVENTORY_VALUE_MISMATCH",
])

export function parseReconciliationIssuesFilter(
  params: ReconciliationIssuesFilterParams
): ReconciliationIssuesFilter {
  const base = parseReconciliationFilter(params)
  const filter: ReconciliationIssuesFilter = { ...base }

  const sourceTypeRaw = params.get("sourceType")?.trim().toUpperCase()
  if (sourceTypeRaw && SOURCE_TYPES.has(sourceTypeRaw)) {
    filter.sourceType = sourceTypeRaw as "SALE" | "STOCK_DOCUMENT"
  }

  const statusRaw = params.get("status")?.trim().toUpperCase()
  if (statusRaw && STATUSES.has(statusRaw as ReconciliationRowStatus)) {
    filter.status = statusRaw as ReconciliationRowStatus
  }

  const domainRaw = params.get("domain")?.trim().toLowerCase()
  if (domainRaw) {
    filter.domain = domainRaw
  }

  const issueTypeRaw = params.get("issueType")?.trim().toUpperCase()
  if (issueTypeRaw && ISSUE_TYPES.has(issueTypeRaw as ReconciliationIssueType)) {
    filter.issueType = issueTypeRaw as ReconciliationIssueType
  }

  return filter
}
