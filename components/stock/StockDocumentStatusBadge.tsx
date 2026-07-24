import { StatusBadge } from "@/components/ui/StatusBadge"
import type { DocStatus } from "@/lib/stock-ui/types"
import { docStatusTone, formatDocStatusLabel } from "@/lib/stock-ui/format"

type StockDocumentStatusBadgeProps = {
  status: DocStatus
}

export function StockDocumentStatusBadge({ status }: StockDocumentStatusBadgeProps) {
  return (
    <StatusBadge tone={docStatusTone(status)} size="sm">
      {formatDocStatusLabel(status)}
    </StatusBadge>
  )
}
