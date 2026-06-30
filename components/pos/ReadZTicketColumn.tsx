"use client"

import type { ReactNode } from "react"
import { PosReadZPrintPreview } from "@/components/pos/PosReadZPrintPreview"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import {
  posReadZPrintButton,
  posReadZPrintHint,
  posReadZPrintHintError,
} from "@/lib/pos-ui/pos-read-report-classes"
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
            className={`${posReadZPrintHint} ${printError ? posReadZPrintHintError : ""} min-h-4 shrink-0 text-center`}
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
            className={`${posReadZPrintButton} shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {printPending ? "Processing…" : printButtonLabel}
          </button>

          {printHint ? (
            <p className={`${posReadZPrintHint} shrink-0 text-center`}>{printHint}</p>
          ) : null}
        </div>
      ) : printError ? (
        <p
          className={`${posReadZPrintHint} ${posReadZPrintHintError} min-h-4 shrink-0 text-center`}
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
