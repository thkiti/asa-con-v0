import Link from "next/link"
import {
  buildGeneralLedgerRefPath,
  formatGeneralLedgerRefDisplay,
  type GeneralLedgerRefFields,
} from "@/lib/finance-ui/general-ledger-display"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type GeneralLedgerRefLinkProps = {
  tx: GeneralLedgerRefFields
  returnTo: string
  className?: string
  "data-testid"?: string
}

export function GeneralLedgerRefLink({
  tx,
  returnTo,
  className = "",
  "data-testid": testId,
}: GeneralLedgerRefLinkProps) {
  const label = formatGeneralLedgerRefDisplay(tx)
  const href = buildGeneralLedgerRefPath(tx, returnTo)

  return (
    <Link
      href={href}
      className={[themeLinkMuted, "print:no-underline", className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      {label}
    </Link>
  )
}
