import type {
  IssueAuditInput,
  ReconciliationIssueRow,
  ReconciliationIssueRowStatus,
  ReconciliationIssuesFilter,
} from "./reconciliation-issue-row-types"

export function deriveIssueStatus(
  issue: IssueAuditInput
): ReconciliationIssueRowStatus {
  if (issue.issueType === "MISSING_VOUCHER") {
    return "MISSING_GL"
  }

  if (issue.issueType === "DUPLICATE_VOUCHER") {
    return "VARIANCE"
  }

  const expected = issue.expectedAmount
  const actual = issue.actualAmount
  const difference = issue.difference

  if (
    expected !== undefined &&
    actual !== undefined &&
    difference !== undefined &&
    Math.abs(difference) < 0.005
  ) {
    return "MATCHED"
  }

  if (expected !== undefined && actual !== undefined) {
    if (Math.abs(actual) < 0.005 && Math.abs(expected) >= 0.005) {
      return "MISSING_GL"
    }
    if (Math.abs(expected) < 0.005 && Math.abs(actual) >= 0.005) {
      return "MISSING_SOURCE"
    }
    return "VARIANCE"
  }

  return "VARIANCE"
}

export function issueMatchesDomain(
  issue: Pick<IssueAuditInput, "sourceType" | "issueType">,
  domain: string | undefined
): boolean {
  const normalized = domain?.trim().toLowerCase()
  if (!normalized || normalized === "all") {
    return true
  }

  if (normalized === "inventory") {
    return (
      issue.sourceType === "STOCK_DOCUMENT" ||
      issue.issueType === "INVENTORY_VALUE_MISMATCH" ||
      issue.issueType === "MISSING_COGS_LINES"
    )
  }

  if (normalized === "revenue") {
    return (
      issue.sourceType === "SALE" &&
      (issue.issueType === "TOTAL_MISMATCH" ||
        issue.issueType === "MISSING_VOUCHER" ||
        issue.issueType === "DUPLICATE_VOUCHER")
    )
  }

  if (normalized === "tender") {
    return issue.sourceType === "SALE"
  }

  return true
}

export function filterIssueRows(
  rows: ReconciliationIssueRow[],
  filter: ReconciliationIssuesFilter
): ReconciliationIssueRow[] {
  return rows.filter((row) => {
    if (filter.sourceType && row.sourceType !== filter.sourceType) {
      return false
    }
    if (filter.status && row.status !== filter.status) {
      return false
    }
    if (filter.issueType && row.issueType !== filter.issueType) {
      return false
    }
    if (!issueMatchesDomain(row, filter.domain)) {
      return false
    }
    return true
  })
}
