"use client"

import { ReadZTicketColumn } from "@/components/pos/ReadZTicketColumn"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type ReadZTodayWorkspaceProps = {
  report: ReadReportPayload
  readZLayout: ResolvedThermalLayout
  onClose: () => void
  onPrintReport?: () => void
  printPending?: boolean
  printError?: string | null
  printAllowed?: boolean
}

/** Normal shop end-of-day READ Z — today only, no HO lookup controls. */
export function ReadZTodayWorkspace({
  report,
  readZLayout,
  onClose,
  onPrintReport,
  printPending = false,
  printError = null,
  printAllowed = true,
}: ReadZTodayWorkspaceProps) {
  return (
    <div
      className="readZTodayWorkspace absolute inset-0 z-[46] flex min-h-0 flex-col bg-orange-600/98 text-white"
      data-testid="pos-read-z-today-workspace"
    >
      <button
        type="button"
        aria-label="Emergency close"
        onClick={onClose}
        disabled={printPending}
        className="group/emergency absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center bg-transparent p-0"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white/20 text-[11px] font-bold leading-none text-white shadow opacity-0 transition-opacity duration-150 group-hover/emergency:opacity-100 hover:cursor-pointer hover:bg-white/30"
        >
          ×
        </span>
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-2 pb-2 pt-10">
        <p className="shrink-0 text-center text-sm font-bold tracking-wide">
          READ Z — สรุปยอดการขายประจำวัน
        </p>

        <ReadZTicketColumn
          report={report}
          readZLayout={readZLayout}
          onPrintReport={onPrintReport}
          printPending={printPending}
          printError={printError}
          printAllowed={printAllowed}
        />
      </div>
    </div>
  )
}
