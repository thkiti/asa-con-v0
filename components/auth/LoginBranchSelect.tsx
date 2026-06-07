"use client"

import { themeInput } from "@/lib/theme/theme-classes"
import type { KeyboardEvent, RefObject } from "react"

import {
  formatLoginBranchOptionLabel,
  type LoginBranchOption,
} from "@/lib/auth/login-branch-options"

type LoginBranchSelectProps = {
  id: string
  name: string
  label: string
  selectRef: RefObject<HTMLSelectElement | null>
  value: string
  ready: boolean
  options: LoginBranchOption[]
  disabled?: boolean
  errorLabel?: string
  successLabel?: string
  onChange: (branchCode: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLSelectElement>) => void
}

export const LOGIN_BRANCH_WAIT_PLACEHOLDER = "ใส่รหัสพนักงานก่อน"
export const LOGIN_BRANCH_SELECT_PLACEHOLDER = "Select branch / เลือกสาขา"

export function LoginBranchSelect({
  id,
  name,
  label,
  selectRef,
  value,
  ready,
  options,
  disabled = false,
  errorLabel,
  successLabel,
  onChange,
  onKeyDown,
}: LoginBranchSelectProps) {
  const hasError = Boolean(errorLabel)
  const hasSuccess = Boolean(successLabel) && !hasError

  const selectClassName = [
    themeInput,
    "pr-10",
    hasError
      ? "border-red-600 text-red-700 focus-visible:border-red-600 focus-visible:ring-1 focus-visible:ring-red-600"
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="font-medium">{label}</span>
      <div className="relative">
        <select
          ref={selectRef}
          id={id}
          name={name}
          className={selectClassName}
          value={ready ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || !ready}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
        >
          <option value="">
            {ready ? LOGIN_BRANCH_SELECT_PLACEHOLDER : LOGIN_BRANCH_WAIT_PLACEHOLDER}
          </option>
          {ready
            ? options.map((option) => (
                <option key={option.id} value={option.code}>
                  {formatLoginBranchOptionLabel(option)}
                </option>
              ))
            : null}
        </select>
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
      {hasError ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {errorLabel}
        </p>
      ) : null}
    </label>
  )
}
