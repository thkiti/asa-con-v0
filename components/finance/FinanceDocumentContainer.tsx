import type { ReactNode } from "react"
import { financeDocumentContainer } from "@/lib/finance-ui/finance-visual-classes"

/** Prototype max width for finance document pages (MJV, OPB, voucher detail). */
export const FINANCE_DOCUMENT_MAX_WIDTH_PX = 1120

type FinanceDocumentContainerProps = {
  children: ReactNode
  className?: string
}

export function FinanceDocumentContainer({
  children,
  className = "",
}: FinanceDocumentContainerProps) {
  return (
    <div
      className={`${financeDocumentContainer} ${className}`.trim()}
      data-testid="finance-document-container"
      data-finance-document-max-width={FINANCE_DOCUMENT_MAX_WIDTH_PX}
    >
      {children}
    </div>
  )
}
