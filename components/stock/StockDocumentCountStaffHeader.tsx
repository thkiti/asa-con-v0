import { formatStockCountStaffDate } from "@/lib/stock-ui/stock-count-staff-mode"

export type StockDocumentCountStaffHeaderProps = {
  refNo: string | null
  branchCode: string
  branchName: string
  staffCode: string
  staffName: string
  documentDate: string
}

export function StockDocumentCountStaffHeader({
  refNo,
  branchCode,
  branchName,
  staffCode,
  staffName,
  documentDate,
}: StockDocumentCountStaffHeaderProps) {
  const refLabel = refNo?.trim() || "—"
  const formattedDate = formatStockCountStaffDate(documentDate)

  return (
    <header className="stock-count-staff-heading border-b border-zinc-200 pb-2">
      <h1 className="text-base font-semibold text-zinc-900">
        ตรวจนับสต๊อก - REF NO. {refLabel}
      </h1>
      <p className="mt-1 whitespace-pre-line text-sm leading-snug text-zinc-700">
        {`${branchCode} • ${branchName}\n/\n${staffCode} • ${staffName}\n/\n${formattedDate}`}
      </p>
    </header>
  )
}
