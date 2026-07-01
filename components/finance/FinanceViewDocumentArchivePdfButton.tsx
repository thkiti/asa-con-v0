"use client"

import { useCallback, useState } from "react"
import { DOCUMENT_ARCHIVE_ACCESS_ERROR } from "@/lib/document-archive-ui/document-archive-messages"
import { openDocumentArchivePdf } from "@/lib/document-archive-ui/open-document-archive-pdf"
import { themeBtnSecondary, themeInlineError } from "@/lib/theme/theme-classes"

type FinanceViewDocumentArchivePdfButtonProps = {
  documentKind: string
  documentId: string
  documentNo: string
  disabled?: boolean
  layout?: "stacked" | "inline"
}

/** Primary action — open document vault PDF in the browser viewer. */
export function FinanceViewDocumentArchivePdfButton({
  documentKind,
  documentId,
  documentNo,
  disabled = false,
  layout = "stacked",
}: FinanceViewDocumentArchivePdfButtonProps) {
  const [accessError, setAccessError] = useState<string | null>(null)

  const handleView = useCallback(async () => {
    if (disabled) return
    setAccessError(null)
    try {
      const ok = await openDocumentArchivePdf({
        documentKind,
        documentId,
        documentNo,
      })
      if (!ok) setAccessError(DOCUMENT_ARCHIVE_ACCESS_ERROR)
    } catch {
      setAccessError(DOCUMENT_ARCHIVE_ACCESS_ERROR)
    }
  }, [disabled, documentId, documentKind, documentNo])

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
        <p className={`text-sm ${themeInlineError}`} data-testid="document-archive-access-error">
          {accessError}
        </p>
      ) : null}
    </div>
  )
}
