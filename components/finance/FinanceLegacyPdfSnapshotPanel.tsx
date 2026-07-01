"use client"

import { useCallback, useState } from "react"
import { buildManualJournalEntryPdfUrl } from "@/lib/finance-ui/manual-journal-entries"
import {
  LEGACY_PDF_SNAPSHOT_ACCESS_ERROR,
  LEGACY_PDF_SNAPSHOT_MISSING_BODY,
  LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY,
  LEGACY_PDF_SNAPSHOT_MISSING_TITLE,
} from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import {
  financeLegacyPdfSnapshotActions,
  financeLegacyPdfSnapshotPanel,
  financeLegacyPdfSnapshotTitle,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeBtnSecondary, themeInlineError, themeTextSecondary } from "@/lib/theme/theme-classes"

type FinanceLegacyPdfSnapshotPanelProps = {
  entryId: string
  entryNo: string
  pdfSnapshotReady: boolean
  disabled?: boolean
  onRegenerate?: () => void | Promise<void>
  regenerating?: boolean
  regenerateError?: string | null
  /** When false, show read-only missing message without regenerate action. */
  showRegenerateButton?: boolean
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

/** Archived PDFKit snapshot — separate from browser Print Out / Save as PDF. */
export function FinanceLegacyPdfSnapshotPanel({
  entryId,
  entryNo,
  pdfSnapshotReady,
  disabled = false,
  onRegenerate,
  regenerating = false,
  regenerateError = null,
  showRegenerateButton = false,
}: FinanceLegacyPdfSnapshotPanelProps) {
  const [accessError, setAccessError] = useState<string | null>(null)

  const openPdf = useCallback(
    async (disposition: "inline" | "attachment") => {
      if (disabled) return
      setAccessError(null)
      try {
        const blob = await fetchLegacyPdfBlob(entryId, disposition)
        if (!blob) {
          setAccessError(LEGACY_PDF_SNAPSHOT_ACCESS_ERROR)
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
        setAccessError(LEGACY_PDF_SNAPSHOT_ACCESS_ERROR)
      }
    },
    [disabled, entryId, entryNo]
  )

  return (
    <div
      className={financeLegacyPdfSnapshotPanel}
      data-testid="finance-legacy-pdf-snapshot"
    >
      <p className={financeLegacyPdfSnapshotTitle}>
        {pdfSnapshotReady ? "Archived PDF snapshot" : LEGACY_PDF_SNAPSHOT_MISSING_TITLE}
      </p>
      {pdfSnapshotReady ? (
        <div className={financeLegacyPdfSnapshotActions}>
          <button
            type="button"
            className={themeBtnSecondary}
            disabled={disabled}
            onClick={() => void openPdf("inline")}
            data-testid="action-view-pdf"
          >
            View archived PDF
          </button>
          <button
            type="button"
            className={themeBtnSecondary}
            disabled={disabled}
            onClick={() => void openPdf("attachment")}
            data-testid="action-download-pdf"
          >
            Download archived PDF
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className={`text-sm ${themeTextSecondary}`} data-testid="legacy-pdf-missing-message">
            {showRegenerateButton && onRegenerate
              ? LEGACY_PDF_SNAPSHOT_MISSING_BODY
              : LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY}
          </p>
          {showRegenerateButton && onRegenerate ? (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled={disabled || regenerating}
              onClick={() => void onRegenerate()}
              data-testid="action-regenerate-pdf"
            >
              {regenerating ? "Regenerating…" : "Regenerate archived PDF"}
            </button>
          ) : null}
        </div>
      )}
      {accessError ? (
        <p className={`mt-2 text-sm ${themeInlineError}`} data-testid="legacy-pdf-access-error">
          {accessError}
        </p>
      ) : null}
      {regenerateError ? (
        <p className={`mt-2 text-sm ${themeInlineError}`} data-testid="pdf-error-message">
          {regenerateError}
        </p>
      ) : null}
    </div>
  )
}
