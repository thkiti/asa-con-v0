"use client"

import { useId, type ReactNode, type SelectHTMLAttributes } from "react"

export type BranchSelectOption = {
  id: string
  code: string
  name: string
}

export function formatBranchSelectLabel(branch: {
  code: string
  name: string
}): string {
  return `${branch.code} • ${branch.name}`
}

type BranchSelectEmptyOption =
  | boolean
  | {
      label: string
      value?: string
    }

export type BranchSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "children" | "placeholder"
> & {
  value: string
  onChange: (value: string) => void
  options: readonly BranchSelectOption[]
  /** Field used as `<option value>`. Default `id`. */
  valueKey?: "id" | "code"
  /**
   * When true, renders an empty option with label "All branches".
   * Pass `{ label }` (and optional `value`) to customize.
   */
  emptyOption?: BranchSelectEmptyOption
  loading?: boolean
  /** Shown when `loading` and no custom empty option label is set. */
  loadingLabel?: string
  /** Visible label above the select. When set, wraps control in `<label>`. */
  label?: ReactNode
  labelClassName?: string
  /** Class on the outer label wrapper (when `label` is set). */
  wrapperClassName?: string
  selectClassName?: string
  formatOptionLabel?: (option: BranchSelectOption) => string
  /** Filter options before render (caller-owned). */
  filterOption?: (option: BranchSelectOption) => boolean
  /** Optional hint text below the select (e.g. load error). */
  hint?: ReactNode
  "data-testid"?: string
}

function resolveEmptyOption(
  emptyOption: BranchSelectEmptyOption | undefined,
  loading: boolean,
  loadingLabel: string
): { value: string; label: string } | null {
  if (emptyOption === undefined || emptyOption === false) return null
  if (emptyOption === true) {
    return {
      value: "",
      label: loading ? loadingLabel : "All branches",
    }
  }
  return {
    value: emptyOption.value ?? "",
    label: loading && !emptyOption.label ? loadingLabel : emptyOption.label,
  }
}

/**
 * Shared branch `<select>` primitive. Caller supplies options and owns fetch /
 * legal-entity / route behavior.
 */
export function BranchSelect({
  value,
  onChange,
  options,
  valueKey = "id",
  emptyOption,
  loading = false,
  loadingLabel = "Loading branches…",
  disabled = false,
  required = false,
  label,
  labelClassName,
  wrapperClassName,
  selectClassName,
  className,
  formatOptionLabel = formatBranchSelectLabel,
  filterOption,
  hint,
  id: idProp,
  "aria-label": ariaLabel,
  "data-testid": testId,
  ...rest
}: BranchSelectProps) {
  const generatedId = useId()
  const selectId = idProp ?? generatedId
  const empty = resolveEmptyOption(emptyOption, loading, loadingLabel)
  const visibleOptions = filterOption ? options.filter(filterOption) : options
  const selectDisabled = disabled || loading

  const select = (
    <select
      {...rest}
      id={selectId}
      value={value}
      required={required}
      disabled={selectDisabled}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      aria-busy={loading || undefined}
      className={selectClassName ?? className}
      data-testid={testId}
      onChange={(event) => onChange(event.target.value)}
    >
      {empty ? <option value={empty.value}>{empty.label}</option> : null}
      {visibleOptions.map((option) => {
        const optionValue = valueKey === "code" ? option.code : option.id
        return (
          <option key={`${option.id}:${optionValue}`} value={optionValue}>
            {formatOptionLabel(option)}
          </option>
        )
      })}
    </select>
  )

  if (!label && !hint && !wrapperClassName) {
    return select
  }

  if (!label) {
    return (
      <div className={wrapperClassName}>
        {select}
        {hint}
      </div>
    )
  }

  return (
    <label className={wrapperClassName} htmlFor={selectId}>
      <span className={labelClassName}>{label}</span>
      {select}
      {hint}
    </label>
  )
}
