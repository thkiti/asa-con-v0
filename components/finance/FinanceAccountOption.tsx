import { ACCOUNT_DISPLAY_BULLET } from "@/lib/finance-ui/format-account"

type FinanceAccountOptionProps = {
  code: string
  name: string
  className?: string
  "data-testid"?: string
}

export function FinanceAccountOption({
  code,
  name,
  className = "",
  "data-testid": testId,
}: FinanceAccountOptionProps) {
  const resolvedCode = code.trim()
  const resolvedName = name.trim()

  return (
    <span
      className={["finance-account-option", className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      <span className="finance-account-option-code">{resolvedCode}</span>
      <span className="finance-account-option-name">
        {resolvedName ? `${ACCOUNT_DISPLAY_BULLET} ${resolvedName}` : ""}
      </span>
    </span>
  )
}
