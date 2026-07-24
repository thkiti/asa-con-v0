"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"

export type PageBackDotButtonProps = {
  /** Used when history back is unavailable or not meaningful. */
  fallbackHref?: string
  /**
   * When set, always navigate here (fixed destination).
   * Prefer `fallbackHref` + history back for standard back behavior.
   */
  href?: string
  /** Tooltip / accessible name. Default `Back`. */
  tooltip?: string
  className?: string
  "data-testid"?: string
}

function canGoBack(): boolean {
  if (typeof window === "undefined") return false
  return window.history.length > 1
}

/**
 * ASA-CON red circular back control (no visible text label).
 * @see docs/ASA_CON_UI_STATUS_NAVIGATION_STANDARD.md §2
 */
export function PageBackDotButton({
  fallbackHref,
  href,
  tooltip = "Back",
  className = "",
  "data-testid": testId = "page-back-dot-button",
}: PageBackDotButtonProps) {
  const router = useRouter()

  const handleClick = useCallback(() => {
    if (href) {
      router.push(href)
      return
    }
    if (canGoBack()) {
      router.back()
      return
    }
    if (fallbackHref) {
      router.push(fallbackHref)
    }
  }, [fallbackHref, href, router])

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      data-fallback-href={href ?? fallbackHref}
      className={`print:hidden inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tone-error-fg,#dc2626)] text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-error-fg,#dc2626)] ${className}`.trim()}
      data-testid={testId}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 3 5 8l5 5" />
      </svg>
    </button>
  )
}

/** Strip legacy "← " prefixes from shell back labels for tooltips. */
export function backTooltipFromLabel(label: string, fallback = "Back"): string {
  const trimmed = label.replace(/^←\s*/u, "").trim()
  if (!trimmed) return fallback
  if (/^back$/i.test(trimmed)) return "Back"
  return `Back to ${trimmed}`
}
