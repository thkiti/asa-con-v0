"use client"

import { useCallback, useState } from "react"
import { LEGACY_PDF_SNAPSHOT_ACCESS_ERROR } from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import { openLegacyArchivedPdf } from "@/lib/finance-ui/finance-legacy-pdf-open"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { themeBtnSecondary, themeInlineError } from "@/lib/theme/theme-classes"

type FinanceViewArchivedPdfButtonProps = {
  legalEntityCode: DocumentEntityCode
  entryId: string
  entryNo: string
  pdfCacheKey?: string | null
  disabled?: boolean
  /** Inline layout for sticky action bars — errors render below the bar. */
  layout?: "stacked" | "inline"
}

/** Primary action — open archived PDF in the browser viewer. */
export function FinanceViewArchivedPdfButton({
  legalEntityCode,
  entryId,
  entryNo,
  pdfCacheKey = null,
  disabled = false,
  layout = "stacked",
}: FinanceViewArchivedPdfButtonProps) {
  const [accessError, setAccessError] = useState<string | null>(null)

  const handleView = useCallback(async () => {
    if (disabled) return
    setAccessError(null)
    try {
      const ok = await openLegacyArchivedPdf({
        legalEntityCode,
        entryId,
        entryNo,
        disposition: "inline",
        cacheKey: pdfCacheKey,
      })
      if (!ok) setAccessError(LEGACY_PDF_SNAPSHOT_ACCESS_ERROR)
    } catch {
      setAccessError(LEGACY_PDF_SNAPSHOT_ACCESS_ERROR)
    }
  }, [disabled, entryId, entryNo, legalEntityCode, pdfCacheKey])

  const button = (
    <button
      type="button"
      className={themeBtnSecondary}
      disabled={disabled}
      onClick={() => void handleView()}
      data-testid="action-view-pdf"
    >
      View archived PDF
    </button>
  )

  if (layout === "inline") {
    return button
  }

  return (
    <div className="flex flex-col gap-1">
      {button}
      {accessError ? (
        <p className={`text-sm ${themeInlineError}`} data-testid="legacy-pdf-access-error">
          {accessError}
        </p>
      ) : null}
    </div>
  )
}
