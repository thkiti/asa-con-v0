import {
  ACCOUNT_DISPLAY_SEPARATOR,
  formatAccountDisplay,
} from "@/lib/finance-ui/format-account"
import { financeAccountDisplay } from "@/lib/finance-ui/finance-visual-classes"

type FinanceAccountDisplayProps = {
  accountCode: string | null | undefined
  accountName: string | null | undefined
  className?: string
  "data-testid"?: string
  /** When true, render a single plain string (export/print). */
  plain?: boolean
}

export function FinanceAccountDisplay({
  accountCode,
  accountName,
  className = "",
  "data-testid": testId,
  plain = false,
}: FinanceAccountDisplayProps) {
  const code = String(accountCode ?? "").trim()
  const name = String(accountName ?? "").trim()

  if (plain || (!code && !name)) {
    return (
      <span
        className={[financeAccountDisplay, className].filter(Boolean).join(" ")}
        data-testid={testId}
      >
        {formatAccountDisplay(code, name)}
      </span>
    )
  }

  return (
    <span
      className={[financeAccountDisplay, className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      {code ? <span className="finance-account-code-part">{code}</span> : null}
      {code && name ? (
        <span className="finance-account-separator">{ACCOUNT_DISPLAY_SEPARATOR}</span>
      ) : null}
      {name ? <span className="finance-account-name-part">{name}</span> : null}
    </span>
  )
}
