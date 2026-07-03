"use client"

import type { InputHTMLAttributes } from "react"
import {
  ACCOUNTING_PERIOD_INPUT_PLACEHOLDER,
  applyAccountingPeriodInputBlur,
  applyAccountingPeriodInputChange,
} from "@/lib/finance-ui/accounting-period-input"

type AccountingPeriodInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string
  onChange: (value: string) => void
}

export function AccountingPeriodInput({
  value,
  onChange,
  placeholder = ACCOUNTING_PERIOD_INPUT_PLACEHOLDER,
  inputMode = "numeric",
  onBlur,
  ...rest
}: AccountingPeriodInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        applyAccountingPeriodInputChange(event.target.value, onChange)
      }}
      onBlur={(event) => {
        applyAccountingPeriodInputBlur(event.target.value, onChange)
        onBlur?.(event)
      }}
    />
  )
}
