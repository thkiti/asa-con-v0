import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRow,
  financeTotalValue,
} from "@/lib/finance-ui/finance-visual-classes"
import { formatStockDocumentInquiryHeader } from "@/lib/stock/inquiry/stock-document-phase-labels"
import type { StockDocumentInquiryDetail } from "@/lib/stock/inquiry/stock-document-inquiry-types"
import { formatDocStatusLabel } from "@/lib/stock-ui/format"
import { themeMeta, themeTextSecondary } from "@/lib/theme/theme-classes"

type StockDocumentInquiryPrintSheetProps = {
  detail: StockDocumentInquiryDetail
}

function PrintTimestamp({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <p className={themeMeta}>
      <span className={themeTextSecondary}>{label}: </span>
      {value ? formatDateTime(value) : "—"}
    </p>
  )
}

/** Compact A4 layout for finance stock document inquiry browser print. */
export function StockDocumentInquiryPrintSheet({
  detail,
}: StockDocumentInquiryPrintSheetProps) {
  const header = formatStockDocumentInquiryHeader(detail)

  return (
    <div
      className="stock-document-inquiry-print-sheet stock-document-inquiry-print-root"
      data-testid="stock-document-inquiry-print-sheet"
    >
      <header className="stock-document-inquiry-print-header print-break-inside-avoid">
        <h1 className="text-base font-semibold text-primary">{header}</h1>
        <p className={`mt-1 text-xs ${themeTextSecondary}`}>
          Finance stock document audit copy — read-only inquiry print.
        </p>
      </header>

      <section
        className="stock-document-inquiry-print-meta print-break-inside-avoid"
        data-testid="stock-document-inquiry-print-meta"
      >
        <p className={themeMeta}>
          <span className={themeTextSecondary}>Status: </span>
          {formatDocStatusLabel(detail.status)}
          {detail.posted ? " (Posted)" : ""}
        </p>
        <PrintTimestamp label="Created" value={detail.createdAt} />
        <PrintTimestamp label="Submitted" value={detail.submittedAt} />
        <PrintTimestamp label="Confirmed" value={detail.confirmedAt} />
        <PrintTimestamp label="Posted" value={detail.postedAt} />
      </section>

      <table className={`${financeTable} stock-document-inquiry-print-lines`}>
        <thead>
          <tr>
            <th className={financeTh}>Product Code</th>
            <th className={financeTh}>Description</th>
            <th className={financeThRight}>Qty</th>
            <th className={financeThRight}>Unit Cost</th>
            <th className={financeThRight}>Amount</th>
            <th className={financeTh}>Note</th>
          </tr>
        </thead>
        <tbody>
          {detail.lines.length === 0 ? (
            <tr>
              <td colSpan={6} className={`py-3 text-center ${themeTextSecondary}`}>
                No lines on this document.
              </td>
            </tr>
          ) : (
            detail.lines.map((line) => (
              <tr key={line.id}>
                <td className="font-mono text-xs">{line.productCode}</td>
                <td>{line.description}</td>
                <td className={financeNumber}>{line.qty}</td>
                <td className={financeNumber}>
                  {line.unitCost != null ? formatAmount(line.unitCost) : "—"}
                </td>
                <td className={financeNumber}>
                  {line.amount != null ? formatAmount(line.amount) : "—"}
                </td>
                <td className={financeMemo}>{line.note ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
        {detail.lines.length > 0 ? (
          <tfoot>
            <tr className={financeTotalRow}>
              <td colSpan={2} className={financeTotalLabel}>
                Total
              </td>
              <td className={financeNumber}>{detail.totalQty}</td>
              <td className={financeNumber}>—</td>
              <td className={financeTotalValue}>
                {detail.totalAmount != null ? formatAmount(detail.totalAmount) : "—"}
              </td>
              <td />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
