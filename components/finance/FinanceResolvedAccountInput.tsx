"use client"

import { formatPreviewLabel } from "@/components/auth/LoginPreviewInput"
import { themeInput } from "@/lib/theme/theme-classes"
import type { KeyboardEvent } from "react"

type FinanceResolvedAccountInputProps = {
  accountCode: string
  accountName: string
  accountError: string | null
  focused: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  onFocus: () => void
  onBlur: () => void
  onChange: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  inputTestId?: string
  resolvedTestId?: string
}

export function FinanceResolvedAccountInput({
  accountCode,
  accountName,
  accountError,
  focused,
  placeholder = "Account No.",
  disabled = false,
  className = "",
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  inputTestId = "resolved-account-code",
  resolvedTestId = "resolved-account-name",
}: FinanceResolvedAccountInputProps) {
  const hasError = Boolean(accountError)
  const hasSuccess =
    Boolean(accountName.trim()) && !hasError && accountCode.trim().length > 0

  let displayValue = accountCode
  if (!focused) {
    if (hasError && accountError) {
      displayValue =
        accountCode.trim().length > 0
          ? formatPreviewLabel(accountCode, accountError)
          : accountError
    } else if (hasSuccess) {
      displayValue = formatPreviewLabel(accountCode, accountName)
    }
  }

  const inputClassName = [
    themeInput,
    "mt-0 min-w-0 flex-1",
    className,
    hasError
      ? "border-red-600 text-red-700 focus-visible:border-red-600 focus-visible:ring-1 focus-visible:ring-red-600"
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="relative min-w-0 flex-1">
      <input
        className={inputClassName}
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={inputTestId}
        aria-invalid={hasError || undefined}
      />
      {hasSuccess ? (
        <span
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-emerald-600"
          aria-hidden
          data-testid={`${inputTestId}-status-success`}
        >
          ✓
        </span>
      ) : null}
      {hasError ? (
        <span
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-red-600"
          aria-hidden
          data-testid={`${inputTestId}-status-error`}
        >
          ✕
        </span>
      ) : null}
      {hasSuccess ? (
        <span className="sr-only" data-testid={resolvedTestId}>
          {formatPreviewLabel(accountCode, accountName)}
        </span>
      ) : (
        <span className="sr-only" data-testid={resolvedTestId} />
      )}
    </div>
  )
}
