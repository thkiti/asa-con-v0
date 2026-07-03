export function buildPeriodReviewPath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId)}/review`
}
