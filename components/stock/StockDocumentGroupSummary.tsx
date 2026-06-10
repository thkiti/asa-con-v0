import { useMemo } from "react"
import {
  buildStockDocumentGroupSummary,
  STOCK_DOCUMENT_GROUP_SUMMARY_TOTAL_LABEL,
  sumStockDocumentGroupSummaryRows,
} from "@/lib/stock-ui/build-counting-group-summary"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"
import {
  countingSummaryBodyCellClass,
  countingSummaryGroupCellClass,
  countingSummaryHeadClass,
  countingSummaryPanelClass,
  countingSummaryPanelStaffClass,
  countingSummaryScrollClass,
  countingSummaryTableHeadClass,
  countingSummaryTotalFooterClass,
  countingSummaryTotalRowClass,
} from "./counting-sheet-styles"

export type StockDocumentGroupSummaryProps = {
  visibleRows: EditorLineRowVM[]
  staffWorkspace?: boolean
}

export function StockDocumentGroupSummary({
  visibleRows,
  staffWorkspace = false,
}: StockDocumentGroupSummaryProps) {
  const summaryRows = useMemo(
    () => buildStockDocumentGroupSummary(visibleRows),
    [visibleRows]
  )

  const displayedRows = useMemo(
    () => summaryRows.filter((row) => row.items > 0),
    [summaryRows]
  )

  const totals = useMemo(
    () => sumStockDocumentGroupSummaryRows(summaryRows),
    [summaryRows]
  )

  const hasCountedLines = displayedRows.length > 0

  return (
    <aside
      className={
        staffWorkspace ? countingSummaryPanelStaffClass : countingSummaryPanelClass
      }
    >
      <div className={`${countingSummaryHeadClass} shrink-0`}>
        <h2 className="text-sm font-semibold text-zinc-950">
          สรุปตามกลุ่มสินค้า
        </h2>
        <p className="mt-1 text-xs font-medium text-zinc-800">
          สำหรับตรวจทาน — ไม่ใช่การบันทึกจำนวน
        </p>
      </div>

      {summaryRows.length === 0 ? (
        <p className="px-3 py-3 text-sm text-zinc-800">
          ยังไม่มีรายการในกลุ่มตะขอที่เลือก
        </p>
      ) : !hasCountedLines ? (
        <p className="px-3 py-3 text-sm text-zinc-800">
          ยังไม่มีรายการที่กรอกจำนวน
        </p>
      ) : (
        <>
          <div className={countingSummaryScrollClass}>
            <table className="w-full text-left text-xs text-zinc-950">
              <thead className={`${countingSummaryTableHeadClass} sticky top-0 z-10`}>
                <tr>
                  <th className="px-2 py-1.5 font-semibold text-zinc-900">
                    กลุ่มสินค้า
                  </th>
                  <th className="px-2 py-1.5 font-semibold text-zinc-900">
                    ชื่อ
                  </th>
                  <th className="px-2 py-1.5 font-semibold text-right whitespace-nowrap text-zinc-900">
                    items
                  </th>
                  <th className="px-2 py-1.5 font-semibold text-right whitespace-nowrap text-zinc-900">
                    จำนวน
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr
                    key={row.productGroup}
                    className="border-b border-zinc-200 bg-white"
                  >
                    <td className={countingSummaryGroupCellClass}>
                      {row.productGroup}
                    </td>
                    <td
                      className="max-w-[8rem] truncate px-2 py-1.5 text-zinc-950"
                      title={row.name}
                    >
                      {row.name}
                    </td>
                    <td className={`${countingSummaryBodyCellClass} text-right`}>
                      {row.items}
                    </td>
                    <td className={`${countingSummaryBodyCellClass} text-right`}>
                      {row.totalQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={countingSummaryTotalFooterClass}>
            <table className={`w-full text-left text-xs ${countingSummaryTotalRowClass}`}>
              <tbody>
                <tr>
                  <td className={`${countingSummaryGroupCellClass} font-bold`}>
                    {STOCK_DOCUMENT_GROUP_SUMMARY_TOTAL_LABEL}
                  </td>
                  <td className="px-2 py-1.5" />
                  <td className={`${countingSummaryBodyCellClass} text-right font-bold`}>
                    {totals.items}
                  </td>
                  <td className={`${countingSummaryBodyCellClass} text-right font-bold`}>
                    {totals.totalQty}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </aside>
  )
}
