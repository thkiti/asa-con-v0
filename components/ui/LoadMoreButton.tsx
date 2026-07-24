"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"

export type LoadMoreButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "children"
> & {
  onClick: () => void
  /** When false, renders nothing. */
  hasMore: boolean
  loading?: boolean
  label?: ReactNode
  loadingLabel?: ReactNode
  "data-testid"?: string
}

/**
 * Load-more / show-more control. Caller owns offset/cursor and fetch behavior.
 */
export function LoadMoreButton({
  onClick,
  hasMore,
  loading = false,
  disabled = false,
  label = "Load more",
  loadingLabel = "Loading…",
  className,
  type = "button",
  "data-testid": testId,
  ...rest
}: LoadMoreButtonProps) {
  if (!hasMore) return null

  return (
    <button
      {...rest}
      type={type}
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid={testId}
      aria-busy={loading || undefined}
    >
      {loading ? loadingLabel : label}
    </button>
  )
}
