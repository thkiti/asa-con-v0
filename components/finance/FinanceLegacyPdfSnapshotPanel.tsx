"use client"

import { useCallback, useState } from "react"
import {
  LEGACY_PDF_SNAPSHOT_ACCESS_ERROR,
  LEGACY_PDF_SNAPSHOT_MISSING_BODY,
  LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY,
  LEGACY_PDF_SNAPSHOT_MISSING_TITLE,
  LEGACY_PDF_SNAPSHOT_REPLACE_HELPER,
} from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import { openLegacyArchivedPdf } from "@/lib/finance-ui/finance-legacy-pdf-open"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  financeLegacyPdfSnapshotActions,
  financeLegacyPdfSnapshotPanel,
  financeLegacyPdfSnapshotTitle,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeBtnSecondary, themeInlineError, themeTextSecondary } from "@/lib/theme/theme-classes"

type FinanceLegacyPdfSnapshotPanelProps = {
  legalEntityCode: DocumentEntityCode
  entryId: string
  entryNo: string
  pdfSnapshotReady: boolean
  /** Bust browser cache for view/download after replace or regenerate. */
  pdfCacheKey?: string | null
  disabled?: boolean
  onRegenerate?: () => void | Promise<void>
  regenerating?: boolean
  regenerateError?: string | null
  onDelete?: () => void | Promise<void>
  deleting?: boolean
  /** When false, show read-only missing message without regenerate action. */
  showRegenerateButton?: boolean
  /** When false, hide Download archived PDF (viewer provides download). Default true. */
  showDownloadButton?: boolean
}

function RegenerateArchivedPdfButton({
  disabled,
  regenerating,
  onRegenerate,
  label,
  testId,
}: {
  disabled: boolean
  regenerating: boolean
  onRegenerate: () => void | Promise<void>
  label: string
  testId: string
}) {
  return (
    <button
      type="button"
      className={themeBtnSecondary}
      disabled={disabled || regenerating}
      onClick={() => void onRegenerate()}
      data-testid={testId}
    >
      {regenerating ? "Regenerating…" : label}
    </button>
  )
}

/** Archived PDF snapshot — View (optional Download) plus admin replace/regenerate/delete. */
export function FinanceLegacyPdfSnapshotPanel({
  legalEntityCode,
  entryId,
  entryNo,
  pdfSnapshotReady,
  pdfCacheKey = null,
  disabled = false,
  onRegenerate,
  regenerating = false,
  regenerateError = null,
  onDelete,
  deleting = false,
  showRegenerateButton = false,
  showDownloadButton = true,
}: FinanceLegacyPdfSnapshotPanelProps) {
  const [accessError, setAccessError] = useState<string | null>(null)
  const canRegenerate = showRegenerateButton && Boolean(onRegenerate)
  const canDelete = showRegenerateButton && Boolean(onDelete)

  const openPdf = useCallback(
    async (disposition: "inline" | "attachment") => {
      if (disabled) return
      setAccessError(null)
      try {
        const ok = await openLegacyArchivedPdf({
          legalEntityCode,
          entryId,
          entryNo,
          disposition,
          cacheKey: pdfCacheKey,
        })
        if (!ok) setAccessError(LEGACY_PDF_SNAPSHOT_ACCESS_ERROR)
      } catch {
        setAccessError(LEGACY_PDF_SNAPSHOT_ACCESS_ERROR)
      }
    },
    [disabled, entryId, entryNo, legalEntityCode, pdfCacheKey]
  )

  return (
    <div
      className={`${financeLegacyPdfSnapshotPanel} w-full max-w-full`}
      data-testid="finance-legacy-pdf-snapshot"
    >
      <p className={financeLegacyPdfSnapshotTitle}>
        {pdfSnapshotReady ? "Archived PDF snapshot" : LEGACY_PDF_SNAPSHOT_MISSING_TITLE}
      </p>
      {pdfSnapshotReady ? (
        <>
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
            {showDownloadButton ? (
              <button
                type="button"
                className={themeBtnSecondary}
                disabled={disabled}
                onClick={() => void openPdf("attachment")}
                data-testid="action-download-pdf"
              >
                Download archived PDF
              </button>
            ) : null}
          </div>
          {canRegenerate || canDelete ? (
            <div className="mt-2 space-y-2" data-testid="legacy-pdf-replace-section">
              {canRegenerate ? (
                <>
                  <p
                    className={`text-sm ${themeTextSecondary}`}
                    data-testid="legacy-pdf-replace-helper"
                  >
                    {LEGACY_PDF_SNAPSHOT_REPLACE_HELPER}
                  </p>
                  <RegenerateArchivedPdfButton
                    disabled={disabled || deleting}
                    regenerating={regenerating}
                    onRegenerate={onRegenerate!}
                    label="Replace archived PDF"
                    testId="action-replace-pdf"
                  />
                </>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className={themeBtnSecondary}
                  disabled={disabled || regenerating || deleting}
                  onClick={() => void onDelete!()}
                  data-testid="action-delete-pdf"
                >
                  {deleting ? "Deleting…" : "Delete archived PDF"}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-2 space-y-2">
          <p className={`text-sm ${themeTextSecondary}`} data-testid="legacy-pdf-missing-message">
            {canRegenerate
              ? LEGACY_PDF_SNAPSHOT_MISSING_BODY
              : LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY}
          </p>
          {canRegenerate ? (
            <RegenerateArchivedPdfButton
              disabled={disabled || deleting}
              regenerating={regenerating}
              onRegenerate={onRegenerate!}
              label="Regenerate archived PDF"
              testId="action-regenerate-pdf"
            />
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
