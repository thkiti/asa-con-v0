"use client"

import type { ReactNode } from "react"
import {
  PageBackDotButton,
  backTooltipFromLabel,
} from "@/components/ui/PageBackDotButton"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"

type FinanceDocumentPageShellProps = {
  backHref: string
  backLabel: string
  children: ReactNode
}

/** Centered document page frame — back control + 1050px container (OPB/MJV/inquiry parity). */
export function FinanceDocumentPageShell({
  backHref,
  backLabel,
  children,
}: FinanceDocumentPageShellProps) {
  return (
    <FinanceDocumentContainer>
      <div className="flex justify-end">
        <PageBackDotButton
          fallbackHref={backHref}
          tooltip={backTooltipFromLabel(backLabel)}
          data-testid="finance-document-back-link"
        />
      </div>
      <div className="mt-4">{children}</div>
    </FinanceDocumentContainer>
  )
}
