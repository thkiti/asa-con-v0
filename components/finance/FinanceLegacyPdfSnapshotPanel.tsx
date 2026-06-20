"use client"

import { useCallback, useState } from "react"
import { buildManualJournalEntryPdfUrl } from "@/lib/finance-ui/manual-journal-entries"
import { LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE } from "@/lib/finance-ui/finance-legacy-pdf-snapshot"

type FinanceLegacyPdfSnapshotPanelProps = {
  entryId: string
  entryNo: string
  pdfSnapshotReady: boolean
  disabled?: boolean
  onRetry?: () => void | Promise<void>
  retrying?: boolean
  retryError?: string | null
}

async function fetchLegacyPdfBlob(
  entryId: string,
  disposition: "inline" | "attachment"
): Promise<Blob | null> {
  const res = await fetch(buildManualJournalEntryPdfUrl(entryId, disposition))
  if (!res.ok) return null
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/pdf")) return null
  return res.blob()
}

/** De-emphasized archived PDFKit snapshot — separate from browser Print Out / Save as PDF. */
export function FinanceLegacyPdfSnapshotPanel({
  entryId,
  entryNo,
  pdfSnapshotReady,
  disabled = false,
  onRetry,
  retrying = false,
  retryError = null,
}: FinanceLegacyPdfSnapshotPanelProps) {
  const [accessError, setAccessError] = useState<string | null>(null)

  const openPdf = useCallback(
    async (disposition: "inline" | "attachment") => {
      if (disabled) return
      setAccessError(null)
      try {
        const blob = await fetchLegacyPdfBlob(entryId, disposition)
        if (!blob) {
          setAccessError(LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE)
          return
        }
        const blobUrl = URL.createObjectURL(blob)
        if (disposition === "inline") {
          window.open(blobUrl, "_blank", "noopener,noreferrer")
        } else {
          const anchor = document.createElement("a")
          anchor.href = blobUrl
          anchor.download = `${entryNo.replace(/[^\w.-]+/g, "_") || entryId}.pdf`
          anchor.click()
        }
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      } catch {
        setAccessError(LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE)
      }
    },
    [disabled, entryId, entryNo]
  )

  return (
    <div
      className="no-print rounded border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-2"
      data-testid="finance-legacy-pdf-snapshot"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Legacy PDF snapshot (archived)
      </p>
      {pdfSnapshotReady ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-50"
            disabled={disabled}
            onClick={() => void openPdf("inline")}
            data-testid="action-view-pdf"
          >
            View archived PDF
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-50"
            disabled={disabled}
            onClick={() => void openPdf("attachment")}
            data-testid="action-download-pdf"
          >
            Download archived PDF
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-zinc-700" data-testid="legacy-pdf-missing-message">
            {LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE}
          </p>
          {onRetry ? (
            <button
              type="button"
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-50"
              disabled={disabled || retrying}
              onClick={() => void onRetry()}
              data-testid="action-retry-pdf"
            >
              {retrying ? "Retrying…" : "Retry archived PDF generation"}
            </button>
          ) : null}
        </div>
      )}
      {accessError ? (
        <p className="mt-2 text-sm text-amber-900" data-testid="legacy-pdf-access-error">
          {accessError}
        </p>
      ) : null}
      {retryError ? (
        <p className="mt-2 text-sm text-red-700" data-testid="pdf-error-message">
          {retryError}
        </p>
      ) : null}
    </div>
  )
}
