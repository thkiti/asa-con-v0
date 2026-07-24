import { TrafficLightStatusDot } from "@/components/ui/TrafficLightStatusDot"
import { financePdfIndicatorStatic } from "@/lib/finance-ui/finance-visual-classes"
import type { PosRecRefLookupRow } from "@/lib/pos-ui/pos-rec-ref-lookup"

type PosRecRefLookupPdfIndicatorProps = {
  row: Pick<PosRecRefLookupRow, "id" | "pdfAvailable">
}

/** Show a red dot only when archive PDF is missing; hide when unsupported or exists. */
export function PosRecRefLookupPdfIndicator({ row }: PosRecRefLookupPdfIndicatorProps) {
  if (row.pdfAvailable !== false) {
    return null
  }

  const label = "PDF missing"

  return (
    <span
      className={financePdfIndicatorStatic}
      aria-label={label}
      title={label}
      role="img"
      data-testid={`pos-rec-ref-lookup-pdf-${row.id}`}
    >
      <TrafficLightStatusDot status="action_required" tooltip={label} />
    </span>
  )
}
