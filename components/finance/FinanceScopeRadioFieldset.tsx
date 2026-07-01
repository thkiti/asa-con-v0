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
    <fieldset className="finance-filter-field finance-filter-fieldset">
      <legend className="finance-filter-label">Scope</legend>
      <div className="finance-filter-control finance-filter-control--radio finance-radio-group">
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
