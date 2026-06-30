import Link from "next/link"
import { PosRecRefLookupPdfIndicator } from "@/components/pos/PosRecRefLookupPdfIndicator"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeTable,
  financeTableScroll,
  financeTh,
  voucherInquiryActions,
  voucherInquiryTable,
  voucherInquiryTdActions,
} from "@/lib/finance-ui/finance-visual-classes"
import type { PosRecRefLookupRow } from "@/lib/pos-ui/pos-rec-ref-lookup"
import {
  themeEmptyState,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

type PosRecRefLookupResultsTableProps = {
  rows: PosRecRefLookupRow[]
  total: number
  selectedId?: string | null
  onSelect?: (row: PosRecRefLookupRow) => void
  testIdPrefix?: string
}

export function PosRecRefLookupResultsTable({
  rows,
  total,
  selectedId = null,
  onSelect,
  testIdPrefix = "pos-rec-ref-lookup",
}: PosRecRefLookupResultsTableProps) {
  return (
    <>
      <p className={`text-sm ${themeTextSecondary}`}>
        {total} document{total === 1 ? "" : "s"}
      </p>
      <div className={financeTableScroll}>
        <table
          className={`${financeTable} ${voucherInquiryTable}`}
          data-testid={`${testIdPrefix}-table`}
        >
          <thead>
            <tr>
              <th className={financeTh}>Doc No.</th>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Branch</th>
              <th className={financeTh}>Type</th>
              <th className={financeTh}>Status</th>
              <th className={financeTh}>PDF</th>
              <th className={financeTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className={`py-4 text-center ${themeEmptyState}`}>
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.docType}-${row.id}`}
                  data-testid={`${testIdPrefix}-row-${row.id}`}
                  aria-selected={selectedId === row.id}
                >
                  <td className={financeMemo}>{row.documentNo}</td>
                  <td>{formatFinanceListDate(row.issuedAt)}</td>
                  <td>
                    {row.branchCode} • {row.branchName}
                  </td>
                  <td>{row.docType}</td>
                  <td>{row.statusLabel}</td>
                  <td>
                    <PosRecRefLookupPdfIndicator row={row} />
                  </td>
                  <td className={voucherInquiryTdActions}>
                    <div className={voucherInquiryActions}>
                      {onSelect ? (
                        <button
                          type="button"
                          className={themeLinkMuted}
                          onClick={() => onSelect(row)}
                          data-testid={`${testIdPrefix}-open-${row.id}`}
                        >
                          Open
                        </button>
                      ) : row.docType === "REC" && row.receipt ? (
                        <Link
                          href={`/shop/receipt/${row.receipt.saleId}`}
                          className={themeLinkMuted}
                          data-testid={`${testIdPrefix}-open-${row.id}`}
                        >
                          Open
                        </Link>
                      ) : row.docType === "REF" && row.refund ? (
                        <Link
                          href={`/shop/refund-receipt/${row.refund.refundId}`}
                          className={themeLinkMuted}
                          data-testid={`${testIdPrefix}-open-${row.id}`}
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
