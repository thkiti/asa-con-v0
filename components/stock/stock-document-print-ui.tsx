import {
  formatDocStatusLabel,
  formatDocumentDate,
  formatStaffFacingDocumentTitle,
  formatStaffFacingDocumentNumber,
} from "@/lib/stock-ui/format"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { getSelectedShopIdFromLocations } from "@/lib/stock/document-read/stock-document-shop-selection"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"
import { numericCell, numericTh } from "@/lib/ui/numeric-display"

type StockDocumentPrintHeaderProps = {
  detail: StockDocumentDetailVM
  viewerEntityCode?: DocumentEntityCode
}

export function StockDocumentPrintHeader({
  detail,
  viewerEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE,
}: StockDocumentPrintHeaderProps) {
  const documentEntityCode =
    parseDocumentEntityCode(detail.legalEntityCode) ?? viewerEntityCode
  const phaseTitle = formatStaffFacingDocumentTitle(
    detail.docType,
    detail.status,
    documentEntityCode
  )
  const displayRefNo = formatStaffFacingDocumentNumber(
    detail.docType,
    detail.status,
    detail.refNo,
    documentEntityCode
  )
  const shopId =
    getSelectedShopIdFromLocations(documentEntityCode, detail.docType, {
      branchId: detail.branchId,
      fromLocId: detail.fromLocId ?? "",
      toLocId: detail.toLocId ?? "",
    }) || detail.branchId

  return (
    <header className="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4">
      <h2 className="text-base font-semibold text-zinc-900">{phaseTitle}</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Printed from saved document record. Operational and audit copy.
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">Reference</dt>
          <dd className="font-mono font-medium text-zinc-900">{displayRefNo}</dd>
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
          <dt className="text-xs text-zinc-500">Shop</dt>
          <dd className="font-mono text-zinc-900">{shopId}</dd>
        </div>
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
            <th className={`py-1 pr-3 font-medium ${numericTh}`}>Qty</th>
            {showAdjFields ? (
              <>
                <th className={`py-1 pr-3 font-medium ${numericTh}`}>Ending qty</th>
                <th className={`py-1 font-medium ${numericTh}`}>ADJ delta</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line) => (
            <tr key={line.id} className="border-b border-zinc-200">
              <td className="py-1 pr-3 font-mono">{line.product.code}</td>
              <td className="py-1 pr-3">{line.product.name}</td>
              <td className={`py-1 pr-3 ${numericCell}`}>{line.qty}</td>
              {showAdjFields ? (
                <>
                  <td className={`py-1 pr-3 ${numericCell}`}>
                    {line.endingQty ?? "—"}
                  </td>
                  <td className={`py-1 ${numericCell}`}>
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
