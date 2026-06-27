"use client"

import type { ReactNode } from "react"
import { PosReadZPrintPreview } from "@/components/pos/PosReadZPrintPreview"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type ReadZTicketColumnProps = {
  report: ReadReportPayload
  readZLayout: ResolvedThermalLayout
  hoControls?: ReactNode
  onPrintReport?: () => void
  printPending?: boolean
  printError?: string | null
  printAllowed?: boolean
  showPrintButton?: boolean
  printButtonLabel?: string
  printHint?: string
  /** When true, omit outer readZReportColumn wrapper (parent owns column layout). */
  embedded?: boolean
}

/** Shared READ Z ticket column — optional HO controls, ticket preview, print button. */
export function ReadZTicketColumn({
  report,
  readZLayout,
  hoControls,
  onPrintReport,
  printPending = false,
  printError = null,
  printAllowed = true,
  showPrintButton = true,
  printButtonLabel = "PRINT REPORT AND EXIT",
  printHint = "กด PRINT REPORT AND EXIT เพื่อพิมพ์และปิดวัน",
  embedded = false,
}: ReadZTicketColumnProps) {
  const canPrint = printAllowed && !printPending

  const body = (
    <>
      {hoControls}

      <div className="readZTicketCard" data-testid="pos-read-z-preview">
        <PosReadZPrintPreview
          report={report}
          layout={readZLayout}
          compact
          testId="pos-read-z-print-preview"
        />
      </div>

      {showPrintButton ? (
        <div className="readZPrintActions">
          <p
            className="readZPrintHint min-h-4 shrink-0 text-center text-sm font-medium text-red-100"
            role="alert"
            aria-live="polite"
          >
            {printError ?? "\u00a0"}
          </p>

          <button
            type="button"
            onClick={() => onPrintReport?.()}
            disabled={!canPrint || !onPrintReport}
            data-testid="pos-read-z-print-report-button"
            className="readZPrintButton shrink-0 cursor-pointer rounded-lg border-2 border-white bg-white px-6 py-2.5 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {printPending ? "Processing…" : printButtonLabel}
          </button>

          {printHint ? (
            <p className="readZPrintHint shrink-0 text-center text-[10px] text-white/80">
              {printHint}
            </p>
          ) : null}
        </div>
      ) : printError ? (
        <p
          className="readZPrintHint min-h-4 shrink-0 text-center text-sm font-medium text-red-100"
          role="alert"
          aria-live="polite"
        >
          {printError}
        </p>
      ) : null}
    </>
  )

  if (embedded) {
    return body
  }

  return (
    <div className="readZReportColumn min-h-0 flex-1 overflow-hidden">
      {body}
    </div>
  )
}
