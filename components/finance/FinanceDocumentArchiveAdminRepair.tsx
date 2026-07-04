"use client"

import { useCallback, useRef, useState } from "react"
import type { DocumentArchiveVaultConfig } from "@/components/document-archive/DocumentArchiveVaultActions"
import { DOCUMENT_ARCHIVE_REPLACE_HELPER } from "@/lib/document-archive-ui/document-archive-messages"
import {
  fetchDocumentArchivePdfStatus,
  uploadDocumentArchivePdf,
} from "@/lib/document-archive-ui/client"
import {
  themeBtnSecondary,
  themeInlineError,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"
import type { DocumentEntityCode } from "@/lib/legal-entity"

type FinanceDocumentArchiveAdminRepairProps = DocumentArchiveVaultConfig & {
  disabled?: boolean
  onPdfAvailableChange?: (pdfAvailable: boolean | null) => void
}

/** HO_ADMIN vault repair — upload/replace archived PDF behind collapsed toggle. */
export function FinanceDocumentArchiveAdminRepair({
  documentKind,
  documentId,
  documentNo,
  legalEntityCode,
  branchId = null,
  workflowStatus,
  disabled = false,
  onPdfAvailableChange,
}: FinanceDocumentArchiveAdminRepairProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUploadClick = useCallback(() => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }, [disabled, uploading])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file || disabled || uploading) return

      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are accepted for document archives.")
        return
      }

      setUploading(true)
      setError(null)
      try {
        await uploadDocumentArchivePdf(legalEntityCode as DocumentEntityCode, {
          file,
          legalEntityCode,
          branchId,
          links: [{ documentKind, documentId, documentNo }],
        })
        const status = await fetchDocumentArchivePdfStatus(legalEntityCode as DocumentEntityCode, {
          documentKind,
          documentId,
          documentNo,
          workflowStatus,
        })
        onPdfAvailableChange?.(status)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Archive upload failed")
      } finally {
        setUploading(false)
      }
    },
    [
      branchId,
      disabled,
      documentId,
      documentKind,
      documentNo,
      legalEntityCode,
      onPdfAvailableChange,
      uploading,
      workflowStatus,
    ]
  )

  return (
    <div className="mt-1" data-testid="document-archive-admin-repair">
      {!open ? (
        <button
          type="button"
          className={`text-sm ${themeLinkMuted}`}
          onClick={() => setOpen(true)}
          data-testid="action-archive-repair-toggle"
        >
          Archive repair
        </button>
      ) : (
        <div
          className="space-y-2 rounded border border-[var(--finance-grid)] px-3 py-2"
          data-testid="document-archive-repair-section"
        >
          <p className={`text-sm ${themeTextSecondary}`} data-testid="document-archive-replace-helper">
            {DOCUMENT_ARCHIVE_REPLACE_HELPER}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            data-testid="document-archive-upload-input"
            onChange={(event) => void handleFileChange(event)}
          />
          <button
            type="button"
            className={themeBtnSecondary}
            disabled={disabled || uploading}
            onClick={handleUploadClick}
            data-testid="action-replace-pdf"
          >
            {uploading ? "Uploading…" : "Replace archived PDF"}
          </button>
          {error ? (
            <p className={`text-sm ${themeInlineError}`} data-testid="document-archive-upload-error">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
