import {
  ACCOUNT_DISPLAY_BULLET,
  formatAccountDisplay,
} from "@/lib/finance-ui/format-account"
import { financeAccountDisplay } from "@/lib/finance-ui/finance-visual-classes"

type FinanceAccountDisplayProps = {
  accountCode?: string | null
  accountName?: string | null
  /** Shorthand aliases for accountCode / accountName */
  code?: string | null
  name?: string | null
  className?: string
  "data-testid"?: string
  /** When true, render a single plain string (export/print fallback). */
  plain?: boolean
}

export function FinanceAccountDisplay({
  accountCode,
  accountName,
  code,
  name,
  className = "",
  "data-testid": testId,
  plain = false,
}: FinanceAccountDisplayProps) {
  const resolvedCode = String(code ?? accountCode ?? "").trim()
  const resolvedName = String(name ?? accountName ?? "").trim()

  if (plain || (!resolvedCode && !resolvedName)) {
    return (
      <span
        className={[financeAccountDisplay, className].filter(Boolean).join(" ")}
        data-testid={testId}
      >
        {formatAccountDisplay(resolvedCode, resolvedName)}
      </span>
    )
  }

  return (
    <span
      className={[financeAccountDisplay, className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      {resolvedCode ? (
        <span className="finance-account-code finance-account-code-part">{resolvedCode}</span>
      ) : null}
      {resolvedCode && resolvedName ? (
        <span className="finance-account-separator">{ACCOUNT_DISPLAY_BULLET}</span>
      ) : null}
      {resolvedName ? (
        <span className="finance-account-name finance-account-name-part">{resolvedName}</span>
      ) : null}
    </span>
  )
}
