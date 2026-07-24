"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import {
  voucherInquiryFilterActions,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
} from "@/lib/finance-ui/finance-visual-classes"
import { INQUIRY_FILTER_DISMISS_ATTR } from "@/lib/finance-ui/inquiry-more-filter-state"

export type InquiryFilterActionsMode =
  | "search-clear"
  | "apply-clear"
  | "apply-only"

export type InquiryFilterActionsProps = {
  mode?: InquiryFilterActionsMode
  onPrimary: () => void
  onClear?: () => void
  primaryLabel?: string
  clearLabel?: string
  /** Replaces primary label while `loading` is true. */
  loadingPrimaryLabel?: string
  loading?: boolean
  primaryDisabled?: boolean
  clearDisabled?: boolean
  primaryType?: ButtonHTMLAttributes<HTMLButtonElement>["type"]
  clearType?: ButtonHTMLAttributes<HTMLButtonElement>["type"]
  /** When true, sets `data-inquiry-filter-dismiss` on action buttons. */
  dismissOnAction?: boolean
  primaryTestId?: string
  clearTestId?: string
  className?: string
  /** Optional trailing slot (secondary domain actions). */
  children?: ReactNode
}

function defaultPrimaryLabel(mode: InquiryFilterActionsMode): string {
  return mode === "search-clear" ? "Search" : "Apply"
}

/**
 * Shared Search / Clear (or Apply-only) actions for inquiry filter bars.
 * Preserves Finance Visual Standard button classes.
 */
export function InquiryFilterActions({
  mode = "search-clear",
  onPrimary,
  onClear,
  primaryLabel,
  clearLabel = "Clear",
  loadingPrimaryLabel,
  loading = false,
  primaryDisabled = false,
  clearDisabled = false,
  primaryType = "button",
  clearType = "button",
  dismissOnAction = false,
  primaryTestId,
  clearTestId,
  className = voucherInquiryFilterActions,
  children,
}: InquiryFilterActionsProps) {
  const showClear = mode !== "apply-only"
  const resolvedPrimaryLabel =
    loading && loadingPrimaryLabel != null
      ? loadingPrimaryLabel
      : (primaryLabel ?? defaultPrimaryLabel(mode))

  const dismissProps = dismissOnAction
    ? { [INQUIRY_FILTER_DISMISS_ATTR]: "true" as const }
    : {}

  return (
    <div className={className}>
      <button
        type={primaryType}
        className={voucherInquiryFilterButtonPrimary}
        onClick={onPrimary}
        disabled={loading || primaryDisabled}
        data-testid={primaryTestId}
        {...dismissProps}
      >
        {resolvedPrimaryLabel}
      </button>
      {showClear ? (
        <button
          type={clearType}
          className={voucherInquiryFilterButtonSecondary}
          onClick={onClear}
          disabled={loading || clearDisabled || !onClear}
          data-testid={clearTestId}
          {...dismissProps}
        >
          {clearLabel}
        </button>
      ) : null}
      {children}
    </div>
  )
}
