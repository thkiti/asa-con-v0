"use client"

import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import {
  posReadXBranchTitle,
  posReadXClose,
  posReadXGroupEmpty,
  posReadXGroupHeader,
  posReadXGroupRow,
  posReadXGroupScroll,
  posReadXHeader,
  posReadXMeta,
  posReadXMonthlyHeader,
  posReadXMonthlyRow,
  posReadXPanel,
  posReadXPaymentFooter,
  posReadXPaymentRow,
  posReadXPaymentScroll,
  posReadXSaleCount,
  posReadXStaff,
  posReadXTitleBadge,
  posReadXTotalPinned,
} from "@/lib/pos-ui/pos-read-report-classes"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

function formatMoney2(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatReadRowQty(q: number): string {
  if (Number.isInteger(q)) return String(q)
  return q.toFixed(2)
}

type PosReadReportPanelProps = {
  report: ReadReportPayload
  onClose: () => void
  readZLayout: ResolvedThermalLayout
}

/** READ X panel — READ Z uses ReadZTodayWorkspace / ReadZLookupWorkspace. */
export function PosReadReportPanel({
  report,
  onClose,
  readZLayout: _readZLayout,
}: PosReadReportPanelProps) {
  const showPolicyGroupTable =
    report.mode === "X" || report.groupLines.length > 0

  return (
    <div
      className={`${posReadXPanel} absolute inset-0 z-[46] flex min-h-0 flex-col print:static print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:text-zinc-900`}
      data-testid="pos-read-x-panel"
    >
      {report.mode === "X" ? (
        <button
          type="button"
          aria-label="ปิดรายงาน"
          onClick={onClose}
          className={posReadXClose}
        >
          ×
        </button>
      ) : null}
      <div className={`${posReadXHeader} shrink-0 space-y-1.5 px-3 pb-2.5 pt-10 text-center print:border-zinc-200 print:pb-2 print:pt-3`}>
        <div className={posReadXBranchTitle}>ASA SERVICES ({report.branchCode})</div>
        <div className={posReadXTitleBadge}>READ X รายงานการขาย</div>
        <div className={posReadXMeta}>
          {`วันที่ (กรุงเทพ) ${report.bangkokDate}`}
          {" · ณ เวลานี้ · โหลดเมื่อ "}
          {new Date(report.generatedAt).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
          })}
        </div>
        <div className={posReadXStaff}>
          STAFF: {report.staffId}
          {report.staffName ? ` • ${report.staffName}` : ""}
        </div>
        <div className={posReadXSaleCount}>จำนวนบิล {report.saleCount} ใบ</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col print:h-auto print:min-h-0">
        <div className={posReadXGroupHeader}>
          <div className="min-w-0 truncate">Group Code-Name</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Amount</div>
        </div>
        <div
          className={`${posReadXGroupScroll} min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 print:h-auto print:max-h-none print:overflow-visible`}
        >
          {!showPolicyGroupTable ? (
            <p className={posReadXGroupEmpty}>ยังไม่มียอดขายในช่วงที่เลือก</p>
          ) : (
            report.groupLines.map((row) => (
              <div key={row.lineKey} className={posReadXGroupRow}>
                <div className="min-w-0 truncate">{row.displayLeft}</div>
                <div className="text-center tabular-nums">{formatReadRowQty(row.qty)}</div>
                <div className="text-right tabular-nums">{formatMoney2(row.amount)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`${posReadXPaymentFooter} flex min-h-[9.5rem] max-h-[42%] shrink-0 flex-col print:block print:h-auto print:max-h-none`}>
        <div className={`${posReadXPaymentScroll} min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 print:h-auto print:max-h-none print:overflow-visible`}>
          <div className="flex flex-col gap-y-1.5">
            {report.paymentLines.map((p) => (
              <div key={p.key} className={posReadXPaymentRow}>
                <span>{p.label}</span>
                <span className="tabular-nums">{formatMoney2(p.amount)}</span>
              </div>
            ))}
          </div>
          {report.monthlySubtotals && report.monthlySubtotals.length > 1 ? (
            <div className="mt-3 border-t border-white/35 pt-2 print:border-zinc-300">
              <div className={posReadXMonthlyHeader}>สรุปยอดตามเดือน (กรุงเทพ)</div>
              <div className="flex flex-col gap-1.5">
                {report.monthlySubtotals.map((m) => (
                  <div key={m.month} className={posReadXMonthlyRow}>
                    <span className="font-mono tabular-nums">{m.month}</span>
                    <span className="pos-read-x-monthly-count">{m.saleCount} ใบ</span>
                    <span className="text-right tabular-nums">
                      {formatMoney2(m.grandTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={posReadXTotalPinned}>
          <div className="flex items-baseline justify-between">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatMoney2(report.grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
