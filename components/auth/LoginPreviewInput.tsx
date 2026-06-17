"use client"

import { themeInput, themeLabel } from "@/lib/theme/theme-classes"
import type { KeyboardEvent, RefObject } from "react"

const PREVIEW_SEPARATOR = " • "

export function formatPreviewLabel(left: string, right: string): string {
  return `${left}${PREVIEW_SEPARATOR}${right}`
}

type LoginPreviewInputProps = {
  id: string
  name: string
  label: string
  inputRef: RefObject<HTMLInputElement | null>
  rawValue: string
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  successLabel?: string
  errorLabel?: string
}

export function LoginPreviewInput({
  id,
  name,
  label,
  inputRef,
  rawValue,
  focused,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  placeholder = "",
  disabled = false,
  autoComplete,
  successLabel,
  errorLabel,
}: LoginPreviewInputProps) {
  const hasError = Boolean(errorLabel)
  const hasSuccess = Boolean(successLabel) && !hasError

  let displayValue = rawValue
  if (!focused) {
    if (hasError && errorLabel) {
      displayValue =
        rawValue.trim().length > 0
          ? formatPreviewLabel(rawValue, errorLabel)
          : errorLabel
    } else if (hasSuccess && successLabel) {
      displayValue = formatPreviewLabel(rawValue, successLabel)
    }
  }

  const inputClassName = [
    themeInput,
    "pr-10",
    hasError
      ? "border-red-600 text-red-700 focus-visible:border-red-600 focus-visible:ring-1 focus-visible:ring-red-600"
      : "",
    hasSuccess && !focused ? "text-foreground" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <label className="block text-sm" htmlFor={id}>
      <span className={themeLabel}>{label}</span>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          className={inputClassName}
          value={displayValue}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        {hasSuccess ? (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-emerald-600"
            aria-hidden
            data-testid={`${name}-status-success`}
          >
            ✓
          </span>
        ) : null}
        {hasError ? (
          <>
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-red-600"
              aria-hidden
              data-testid={`${name}-status-error`}
            >
              ✕
            </span>
            <span id={`${id}-error`} className="sr-only" role="alert">
              {errorLabel}
            </span>
          </>
        ) : null}
      </div>
    </label>
  )
}
