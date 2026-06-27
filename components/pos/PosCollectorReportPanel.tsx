"use client"

import { PosCollectorPrintPreview } from "@/components/pos/PosCollectorPrintPreview"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosCollectorReportPanelProps = {
  report: ReadReportPayload
  collectorLayout: ResolvedThermalLayout
  pending?: boolean
  error?: string | null
  onPrintReport: () => void
  onClose: () => void
}

/**
 * COLLECTOR report — on-screen thermal slip is the same DOM used for print clone.
 */
export function PosCollectorReportPanel({
  report,
  collectorLayout,
  pending = false,
  error = null,
  onPrintReport,
  onClose,
}: PosCollectorReportPanelProps) {
  return (
    <div
      className="absolute inset-0 z-[46] flex min-h-0 flex-col bg-orange-600/98 text-white"
      data-testid="pos-collector-report-panel"
    >
      <button
        type="button"
        aria-label="Close collector report"
        onClick={onClose}
        disabled={pending}
        data-testid="pos-collector-report-close"
        className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pb-2 pt-10">
        <p className="shrink-0 text-center text-sm font-bold tracking-wide">
          COLLECTOR — รายงานเก็บยอดเงินสด
        </p>
        <p className="shrink-0 text-center text-[11px] text-white/85">
          ช่วงวันที่ (กรุงเทพ) {report.bangkokDate} · ผู้เก็บเงิน {report.staffId}
          {report.staffName ? ` • ${report.staffName}` : ""}
        </p>

        <div
          className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
          data-testid="pos-collector-report-preview"
        >
          <PosCollectorPrintPreview
            report={report}
            layout={collectorLayout}
            compact
            testId="pos-collector-print-preview"
          />
        </div>

        <p
          className="min-h-4 shrink-0 text-center text-sm font-medium text-red-100"
          role="alert"
          aria-live="polite"
        >
          {error ?? "\u00a0"}
        </p>

        <button
          type="button"
          onClick={onPrintReport}
          disabled={pending}
          data-testid="pos-collector-print-report-button"
          className="shrink-0 rounded-lg border-2 border-white bg-white px-6 py-2.5 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Processing…" : "PRINT REPORT"}
        </button>

        <p className="shrink-0 text-center text-[10px] text-white/80">
          กด PRINT REPORT เพื่อบันทึกและพิมพ์ตั๋ว
        </p>
      </div>
    </div>
  )
}
