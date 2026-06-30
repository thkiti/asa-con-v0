"use client"

import { PosReadZLookupControls } from "@/components/pos/PosReadZLookupControls"
import { ReadZTicketColumn } from "@/components/pos/ReadZTicketColumn"
import {
  READ_Z_LOOKUP_EMPTY_MESSAGE,
  readZLookupDailyHasTicket,
  type ReadZLookupMode,
} from "@/lib/pos-ui/read-z-lookup-display"
import {
  posReadZLookupEmpty,
  posReadZLookupLoading,
  posReadZLookupWorkspace,
  posReadZTitle,
  posReadZTitleBadge,
} from "@/lib/pos-ui/pos-read-report-classes"
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
      className={`${posReadZLookupWorkspace} absolute inset-0 z-[46] flex min-h-0 flex-col`}
      data-testid="pos-read-z-lookup-workspace"
    >
      <button
        type="button"
        aria-label="ปิด READ Z Lookup"
        onClick={onClose}
        disabled={printPending || reviewLoading}
        className="pos-read-z-lookup-close absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-2 pb-2 pt-10">
        <p className={`${posReadZTitle} shrink-0 text-center`}>
          <span className={posReadZTitleBadge}>READ Z Lookup</span>
          {" — ดูย้อนหลัง / Cumulative (HO)"}
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
            <p className={posReadZLookupLoading} data-testid="pos-read-z-lookup-loading">
              กำลังโหลดรายงาน…
            </p>
          ) : null}

          {showDailyEmpty ? (
            <p className={posReadZLookupEmpty} data-testid="pos-read-z-lookup-empty">
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
