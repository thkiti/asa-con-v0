"use client"

import type { ReactNode } from "react"
import { voucherInquiryFilterButtonSecondary } from "@/lib/finance-ui/finance-visual-classes"

export type ListPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Optional summary (e.g. "Showing 1–50 of 200"). Rendered to the left. */
  summary?: ReactNode
  loading?: boolean
  prevLabel?: string
  nextLabel?: string
  /** When true (default), hides controls when `totalPages <= 1`. */
  hideWhenSinglePage?: boolean
  className?: string
  controlsClassName?: string
  buttonClassName?: string
  prevTestId?: string
  nextTestId?: string
  testId?: string
  summaryTestId?: string
}

/**
 * Previous/Next list pagination. Caller owns page state, page size, and fetch.
 */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
  summary,
  loading = false,
  prevLabel = "Previous",
  nextLabel = "Next",
  hideWhenSinglePage = true,
  className = "flex flex-wrap items-center justify-between gap-2",
  controlsClassName = "flex items-center gap-2",
  buttonClassName = voucherInquiryFilterButtonSecondary,
  prevTestId,
  nextTestId,
  testId,
  summaryTestId,
}: ListPaginationProps) {
  const showControls = !hideWhenSinglePage || totalPages > 1
  if (!summary && !showControls) return null

  return (
    <div className={className}>
      {summary != null ? (
        <div data-testid={summaryTestId}>{summary}</div>
      ) : (
        <span />
      )}
      {showControls ? (
        <div className={controlsClassName} data-testid={testId}>
          <button
            type="button"
            className={buttonClassName}
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={prevLabel}
            data-testid={prevTestId}
          >
            {prevLabel}
          </button>
          <button
            type="button"
            className={buttonClassName}
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={nextLabel}
            data-testid={nextTestId}
          >
            {nextLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
