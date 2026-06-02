import type { DocStatus } from "@/lib/stock-ui/types"
import {
  docStatusToneClass,
  formatDocStatusLabel,
} from "@/lib/stock-ui/format"

type StockDocumentStatusBadgeProps = {
  status: DocStatus
}

export function StockDocumentStatusBadge({ status }: StockDocumentStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${docStatusToneClass(status)}`}
    >
      {formatDocStatusLabel(status)}
    </span>
  )
}
