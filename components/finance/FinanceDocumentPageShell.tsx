import Link from "next/link"
import type { ReactNode } from "react"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type FinanceDocumentPageShellProps = {
  backHref: string
  backLabel: string
  children: ReactNode
}

/** Centered document page frame — back link + 1050px container (OPB/MAJ/inquiry parity). */
export function FinanceDocumentPageShell({
  backHref,
  backLabel,
  children,
}: FinanceDocumentPageShellProps) {
  return (
    <FinanceDocumentContainer>
      <Link href={backHref} className={`text-sm ${themeLinkMuted}`}>
        {backLabel}
      </Link>
      <div className="mt-4">{children}</div>
    </FinanceDocumentContainer>
  )
}
