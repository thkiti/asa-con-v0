type FinanceScopeMode = "period" | "dateRange"

type FinanceScopeRadioFieldsetProps = {
  name: string
  value: FinanceScopeMode
  onChange: (mode: FinanceScopeMode) => void
}

export function FinanceScopeRadioFieldset({
  name,
  value,
  onChange,
}: FinanceScopeRadioFieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600">Scope</span>
      <div className="finance-radio-group">
        <label className="finance-radio-option">
          <input
            type="radio"
            className="finance-radio-input"
            name={name}
            checked={value === "period"}
            onChange={() => onChange("period")}
          />
          Period
        </label>
        <label className="finance-radio-option">
          <input
            type="radio"
            className="finance-radio-input"
            name={name}
            checked={value === "dateRange"}
            onChange={() => onChange("dateRange")}
          />
          Date range
        </label>
      </div>
    </fieldset>
  )
}
