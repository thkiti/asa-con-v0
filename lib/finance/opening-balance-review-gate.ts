import type { CloseChecklistResult } from "./close-checklist-types"
import { FinancePostingError } from "./posting-errors"
import type { OpeningBalanceReviewResult } from "./opening-balance-review-types"

export function openingBalanceReviewToCloseChecklist(
  review: OpeningBalanceReviewResult
): CloseChecklistResult {
  return {
    status: review.status,
    blockerCount: review.blockerCount,
    warningCount: 0,
    items: review.items.map((item) => ({
      id: item.id,
      group: "audit_evidence",
      severity: item.passed ? "PASS" : "BLOCKED",
      title: item.title,
      detail: item.detail,
    })),
    latestSnapshotRef: null,
    metrics: {
      issueCount: 0,
      varianceCount: 0,
      matchedCount: 0,
      dashboardRowCount: 0,
      totalVarianceAmount: null,
      missingGlIssueCount: 0,
      missingSourceIssueCount: 0,
      inventoryDomainPresent: false,
      revenueDomainPresent: false,
      snapshotAgeDays: null,
      compareDriftDetected: false,
      bankReconciliationCompleted: null,
      cashReconciliationCompleted: null,
      bankUnresolvedVarianceCount: null,
      cashUnresolvedVarianceCount: null,
    },
    period: review.period,
  }
}

export function assertOpeningBalanceReviewReady(
  review: OpeningBalanceReviewResult
): void {
  if (review.status === "READY") {
    return
  }

  const blockers = review.items.filter((item) => !item.passed)
  const label = blockers.length === 1 ? "check" : "checks"
  throw new FinancePostingError(
    `Opening balance review blocked: ${blockers.length} ${label} must pass before locking the period`,
    "OPENING_BALANCE_REVIEW_BLOCKED"
  )
}
