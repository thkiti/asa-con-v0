"use client"

import { formatPreviewLabel } from "@/components/auth/LoginPreviewInput"
import { themeInput } from "@/lib/theme/theme-classes"
import type { KeyboardEvent } from "react"

type MjvLineAccountInputProps = {
  lineKey: string
  accountCode: string
  accountName: string
  accountError: string | null
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function MjvLineAccountInput({
  lineKey,
  accountCode,
  accountName,
  accountError,
  focused,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
}: MjvLineAccountInputProps) {
  const hasError = Boolean(accountError)
  const hasSuccess = Boolean(accountName.trim()) && !hasError && accountCode.trim().length > 0

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
    "mjv-line-account-input mt-0 w-full",
    hasError
      ? "border-red-600 text-red-700 focus-visible:border-red-600 focus-visible:ring-1 focus-visible:ring-red-600"
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="relative">
      <input
        className={inputClassName}
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="Account No."
        data-line-key={lineKey}
        data-field="account"
        data-testid="line-account-code"
        aria-invalid={hasError || undefined}
      />
      {hasSuccess ? (
        <span
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-emerald-600"
          aria-hidden
          data-testid="line-account-status-success"
        >
          ✓
        </span>
      ) : null}
      {hasError ? (
        <span
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-red-600"
          aria-hidden
          data-testid="line-account-status-error"
        >
          ✕
        </span>
      ) : null}
      {hasSuccess ? (
        <span className="sr-only" data-testid="line-account-name">
          {formatPreviewLabel(accountCode, accountName)}
        </span>
      ) : (
        <span className="sr-only" data-testid="line-account-name" />
      )}
    </div>
  )
}
