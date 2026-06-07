"use client"

import { PosCollectorTicketSlip } from "@/components/pos/PosCollectorTicketSlip"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

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
}

export function PosReadReportPanel({ report, onClose }: PosReadReportPanelProps) {
  const printRoot = report.mode === "Z" ? "pos-read-z-print-root" : ""

  return (
    <div
      className={`absolute inset-0 z-[46] flex min-h-0 flex-col bg-orange-600 text-white print:bg-white print:text-zinc-900 ${printRoot}`}
    >
      {report.mode === "COLLECT" ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 opacity-0">
          <PosCollectorTicketSlip report={report} />
        </div>
      ) : null}
      <button
        type="button"
        aria-label="ปิดรายงาน"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none text-white shadow hover:bg-white/30 print:hidden"
      >
        ×
      </button>
      <div className="shrink-0 space-y-2 border-b border-white/25 px-3 pb-3 pt-10 text-center print:border-zinc-200 print:pb-2 print:pt-3">
        <div className="text-sm font-bold print:text-zinc-900">
          ASA SERVICES ({report.branchCode})
        </div>
        <div className="font-mono text-[11px] font-bold leading-snug print:text-zinc-900">
          {report.mode === "X"
            ? "READ X รายงานการขาย"
            : report.mode === "Z"
              ? "READ Z สรุปยอดการขายประจำวัน"
              : "COLLECTOR — รายงานเก็บยอดเงินสด"}
        </div>
        <div className="text-[10px] text-white/85 print:text-zinc-600">
          {report.mode === "COLLECT"
            ? `ช่วงวันที่ (กรุงเทพ) ${report.bangkokDate}`
            : `วันที่ (กรุงเทพ) ${report.bangkokDate}`}{" "}
          · พิมพ์{" "}
          {new Date(report.generatedAt).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
          })}
        </div>
        <div className="text-[11px] font-semibold print:text-zinc-800">
          {report.mode === "COLLECT" ? "ผู้เก็บเงิน" : "STAFF"}: {report.staffId}
          {report.staffName ? ` • ${report.staffName}` : ""}
        </div>
        <div className="text-[10px] text-white/75 print:text-zinc-500">
          จำนวนบิล {report.saleCount} ใบ
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 print:overflow-visible">
        <div className="grid grid-cols-[1fr_44px_76px] gap-x-1 border-b border-white/30 pb-1 text-[10px] font-bold text-white/95 print:border-zinc-300 print:text-zinc-900">
          <div className="min-w-0 truncate">Group Code-Name</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Amount</div>
        </div>
        {report.groupLines.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/70 print:text-zinc-500">
            {report.mode === "COLLECT"
              ? "ยังไม่มียอดขายในช่วงที่เลือก"
              : "ยังไม่มียอดขายในวันนี้"}
          </p>
        ) : (
          report.groupLines.map((row) => (
            <div
              key={row.lineKey}
              className="grid grid-cols-[1fr_44px_76px] gap-x-1 border-b border-white/15 py-[3px] font-mono text-[9px] leading-tight text-white print:border-zinc-200 print:text-black sm:text-[10px]"
            >
              <div className="min-w-0 truncate">{row.displayLeft}</div>
              <div className="text-center tabular-nums">{formatReadRowQty(row.qty)}</div>
              <div className="text-right tabular-nums">{formatMoney2(row.amount)}</div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-white/30 bg-blue-600 px-3 py-3 print:border-t print:border-zinc-300 print:bg-zinc-100">
        <div className="flex flex-col items-stretch gap-y-1.5">
          {report.paymentLines.map((p) => (
            <div
              key={p.key}
              className="flex items-baseline justify-between gap-3 text-sm font-bold text-white print:text-zinc-900"
            >
              <span>{p.label}</span>
              <span className="tabular-nums">{formatMoney2(p.amount)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-baseline justify-between border-t border-white/35 pt-2 text-lg font-black text-white print:border-zinc-300 print:text-black">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatMoney2(report.grandTotal)}</span>
          </div>
          {report.monthlySubtotals && report.monthlySubtotals.length > 1 ? (
            <div className="mt-3 border-t border-white/35 pt-2 print:border-zinc-300">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/90 print:text-zinc-700">
                สรุปยอดตามเดือน (กรุงเทพ)
              </div>
              <div className="flex flex-col gap-1.5">
                {report.monthlySubtotals.map((m) => (
                  <div
                    key={m.month}
                    className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-2 text-xs font-semibold text-white/95 print:text-zinc-900"
                  >
                    <span className="font-mono tabular-nums">{m.month}</span>
                    <span className="text-[10px] text-white/75 print:text-zinc-600">
                      {m.saleCount} ใบ
                    </span>
                    <span className="text-right tabular-nums">
                      {formatMoney2(m.grandTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
