"use client"

import { PosReadZLookupControls } from "@/components/pos/PosReadZLookupControls"
import { ReadZTicketColumn } from "@/components/pos/ReadZTicketColumn"
import {
  READ_Z_LOOKUP_EMPTY_MESSAGE,
  readZLookupDailyHasTicket,
  type ReadZLookupMode,
} from "@/lib/pos-ui/read-z-lookup-display"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type ReadZLookupWorkspaceProps = {
  selectedDate: string
  lookupMode: ReadZLookupMode
  report: ReadReportPayload | null
  readZLayout: ResolvedThermalLayout
  onClose: () => void
  reviewLoading?: boolean
  printError?: string | null
  onDateSelect: (ymd: string) => void
  onCumulativePress: () => void
  onPrintReport?: () => void
  printPending?: boolean
  printAllowed?: boolean
}

/** HO/admin READ Z lookup — one ticket per date; cumulative month-to-date summary. */
export function ReadZLookupWorkspace({
  selectedDate,
  lookupMode,
  report,
  readZLayout,
  onClose,
  reviewLoading = false,
  printError = null,
  onDateSelect,
  onCumulativePress,
  onPrintReport,
  printPending = false,
  printAllowed = false,
}: ReadZLookupWorkspaceProps) {
  const showDailyEmpty =
    lookupMode === "daily" &&
    report !== null &&
    !reviewLoading &&
    !readZLookupDailyHasTicket(report)

  const showTicket =
    report !== null && !reviewLoading && !showDailyEmpty

  const canPrint = printAllowed && showTicket

  return (
    <div
      className="readZLookupWorkspace absolute inset-0 z-[46] flex min-h-0 flex-col bg-orange-600/98 text-white"
      data-testid="pos-read-z-lookup-workspace"
    >
      <button
        type="button"
        aria-label="ปิด READ Z Lookup"
        onClick={onClose}
        disabled={printPending || reviewLoading}
        className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none text-white shadow hover:bg-white/30"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-2 pb-2 pt-10">
        <p className="shrink-0 text-center text-sm font-bold tracking-wide">
          READ Z Lookup — ดูย้อนหลัง / Cumulative (HO)
        </p>

        <div className="readZReportColumn min-h-0 flex-1 overflow-hidden">
          <PosReadZLookupControls
            selectedDate={selectedDate}
            lookupMode={lookupMode}
            reviewLoading={reviewLoading}
            onDateSelect={onDateSelect}
            onCumulativePress={onCumulativePress}
          />

          {reviewLoading ? (
            <p
              className="mt-4 text-center text-xs text-white/85"
              data-testid="pos-read-z-lookup-loading"
            >
              กำลังโหลดรายงาน…
            </p>
          ) : null}

          {showDailyEmpty ? (
            <p
              className="readZLookupEmptyState mt-4 text-center text-sm font-medium text-white/90"
              data-testid="pos-read-z-lookup-empty"
            >
              {READ_Z_LOOKUP_EMPTY_MESSAGE}
            </p>
          ) : null}

          {showTicket ? (
            <ReadZTicketColumn
              embedded
              report={report}
              readZLayout={readZLayout}
              onPrintReport={onPrintReport}
              printPending={printPending}
              printError={printError}
              printAllowed={canPrint}
              showPrintButton={canPrint}
              printButtonLabel="PRINT REPORT"
              printHint={
                canPrint ? "พิมพ์รายงานตามวันที่/ช่วงที่เลือก (ดูอย่างเดียว)" : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
