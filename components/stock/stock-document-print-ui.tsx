import {
  formatDocStatusLabel,
  formatDocTypeLabel,
  formatDocumentDate,
} from "@/lib/stock-ui/format"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"

type StockDocumentPrintHeaderProps = {
  detail: StockDocumentDetailVM
}

export function StockDocumentPrintHeader({ detail }: StockDocumentPrintHeaderProps) {
  return (
    <header className="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4">
      <h2 className="text-base font-semibold text-zinc-900">Stock document</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Printed from saved document record. Operational and audit copy.
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">Reference</dt>
          <dd className="font-mono font-medium text-zinc-900">{detail.refNo}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Type</dt>
          <dd className="font-medium text-zinc-900">
            {formatDocTypeLabel(detail.docType)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Status</dt>
          <dd className="font-medium text-zinc-900">
            {formatDocStatusLabel(detail.status)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Date</dt>
          <dd className="font-medium text-zinc-900">{formatDocumentDate(detail.date)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Branch</dt>
          <dd className="font-mono text-zinc-900">{detail.branchId}</dd>
        </div>
        {detail.fromLocId ? (
          <div>
            <dt className="text-xs text-zinc-500">From location</dt>
            <dd className="font-mono text-zinc-900">{detail.fromLocId}</dd>
          </div>
        ) : null}
        {detail.toLocId ? (
          <div>
            <dt className="text-xs text-zinc-500">To location</dt>
            <dd className="font-mono text-zinc-900">{detail.toLocId}</dd>
          </div>
        ) : null}
      </dl>
    </header>
  )
}

type StockDocumentPrintLinesTableProps = {
  detail: StockDocumentDetailVM
}

export function StockDocumentPrintLinesTable({
  detail,
}: StockDocumentPrintLinesTableProps) {
  const showAdjFields = detail.docType === "ADJUSTMENT"

  return (
    <section className="print-only">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">Document lines</h3>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-400 text-left text-zinc-700">
            <th className="py-1 pr-3 font-medium">Code</th>
            <th className="py-1 pr-3 font-medium">Name</th>
            <th className="py-1 pr-3 text-right font-medium">Qty</th>
            {showAdjFields ? (
              <>
                <th className="py-1 pr-3 text-right font-medium">Ending qty</th>
                <th className="py-1 text-right font-medium">ADJ delta</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line) => (
            <tr key={line.id} className="border-b border-zinc-200">
              <td className="py-1 pr-3 font-mono">{line.product.code}</td>
              <td className="py-1 pr-3">{line.product.name}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{line.qty}</td>
              {showAdjFields ? (
                <>
                  <td className="py-1 pr-3 text-right tabular-nums">
                    {line.endingQty ?? "—"}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {line.reviewPostingDelta ?? "—"}
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
