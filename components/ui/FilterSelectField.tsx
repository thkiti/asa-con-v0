"use client"

import { useId, type ReactNode, type SelectHTMLAttributes } from "react"
import {
  voucherInquiryFilterDocType,
  voucherInquiryFilterSelect,
  voucherInquiryFilterStatus,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel } from "@/lib/theme/theme-classes"

export type FilterSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type FilterSelectEmptyOption =
  | boolean
  | {
      label: string
      value?: string
    }

export type FilterSelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "children"
> & {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  options: readonly FilterSelectOption[]
  /**
   * When true, prepends an empty option labeled "All".
   * Pass `{ label }` (and optional `value`) to customize.
   * Omit when the caller already includes an empty/All row in `options`.
   */
  emptyOption?: FilterSelectEmptyOption
  loading?: boolean
  loadingLabel?: string
  labelClassName?: string
  wrapperClassName?: string
  selectClassName?: string
  "data-testid"?: string
}

function resolveEmptyOption(
  emptyOption: FilterSelectEmptyOption | undefined,
  loading: boolean,
  loadingLabel: string
): { value: string; label: string } | null {
  if (emptyOption === undefined || emptyOption === false) return null
  if (emptyOption === true) {
    return {
      value: "",
      label: loading ? loadingLabel : "All",
    }
  }
  return {
    value: emptyOption.value ?? "",
    label: loading && !emptyOption.label ? loadingLabel : emptyOption.label,
  }
}

/**
 * Labeled filter `<select>` primitive. Caller supplies options and owns domain
 * ordering, URL sync, and status/doc-type mapping.
 */
export function FilterSelectField({
  label,
  value,
  onChange,
  options,
  emptyOption,
  loading = false,
  loadingLabel = "Loading…",
  disabled = false,
  required = false,
  labelClassName = themeLabel,
  wrapperClassName,
  selectClassName = voucherInquiryFilterSelect,
  id: idProp,
  "aria-label": ariaLabel,
  "data-testid": testId,
  ...rest
}: FilterSelectFieldProps) {
  const generatedId = useId()
  const selectId = idProp ?? generatedId
  const empty = resolveEmptyOption(emptyOption, loading, loadingLabel)
  const selectDisabled = disabled || loading

  return (
    <label className={wrapperClassName} htmlFor={selectId}>
      <span className={labelClassName}>{label}</span>
      <select
        {...rest}
        id={selectId}
        value={value}
        required={required}
        disabled={selectDisabled}
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        aria-busy={loading || undefined}
        className={selectClassName}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      >
        {empty ? <option value={empty.value}>{empty.label}</option> : null}
        {options.map((option, index) => (
          <option
            key={`${option.value}:${option.label}:${index}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export type DocumentTypeFilterFieldProps = Omit<FilterSelectFieldProps, "label"> & {
  label?: ReactNode
}

/** Inquiry-bar Doc Type field with Finance Visual Standard classes by default. */
export function DocumentTypeFilterField({
  label = "Doc Type",
  wrapperClassName = voucherInquiryFilterDocType,
  selectClassName = voucherInquiryFilterSelect,
  labelClassName = themeLabel,
  ...rest
}: DocumentTypeFilterFieldProps) {
  return (
    <FilterSelectField
      label={label}
      wrapperClassName={wrapperClassName}
      selectClassName={selectClassName}
      labelClassName={labelClassName}
      {...rest}
    />
  )
}

export type StatusFilterFieldProps = Omit<FilterSelectFieldProps, "label"> & {
  label?: ReactNode
}

/** Inquiry-bar Status field with Finance Visual Standard classes by default. */
export function StatusFilterField({
  label = "Status",
  wrapperClassName = voucherInquiryFilterStatus,
  selectClassName = voucherInquiryFilterSelect,
  labelClassName = themeLabel,
  ...rest
}: StatusFilterFieldProps) {
  return (
    <FilterSelectField
      label={label}
      wrapperClassName={wrapperClassName}
      selectClassName={selectClassName}
      labelClassName={labelClassName}
      {...rest}
    />
  )
}
