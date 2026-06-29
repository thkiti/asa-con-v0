"use client"

import { themeInput, themeLabel } from "@/lib/theme/theme-classes"

export const financeSettlementDateInputClass =
  "finance-settlement-date-input mt-0 cursor-pointer"

type FinanceSettlementDateInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  "data-testid"?: string
  required?: boolean
  fieldClassName?: string
}

export function FinanceSettlementDateInput({
  label,
  value,
  onChange,
  "data-testid": dataTestId,
  required = false,
  fieldClassName = "flex flex-col gap-1 text-sm",
}: FinanceSettlementDateInputProps) {
  return (
    <label className={fieldClassName}>
      <span className={themeLabel}>{label}</span>
      <input
        type="date"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={`${financeSettlementDateInputClass} ${themeInput}`}
        data-testid={dataTestId}
      />
    </label>
  )
}
