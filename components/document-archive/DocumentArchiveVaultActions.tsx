"use client"

import type { DocumentKind } from "@/generated/prisma/client"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchDocumentArchivePdfStatus,
  uploadDocumentArchivePdf,
} from "@/lib/document-archive-ui/client"
import { buildDocumentArchiveByDocumentDownloadPath } from "@/lib/document-archive-ui/paths"
import type { DocumentEntityCode } from "@/lib/legal-entity"
import { themeInlineError } from "@/lib/theme/theme-classes"

const actionButtonClass =
  "rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"

export type DocumentArchiveVaultConfig = {
  documentKind: DocumentKind
  documentId: string
  documentNo: string
  legalEntityCode: string
  branchId?: string | null
  workflowStatus: string
  /** Server-known tri-state; refreshed on mount and after upload. */
  initialPdfAvailable?: boolean | null
}

type DocumentArchiveVaultActionsProps = DocumentArchiveVaultConfig & {
  disabled?: boolean
  onPdfAvailableChange?: (pdfAvailable: boolean | null) => void
}

export function DocumentArchiveVaultActions({
  documentKind,
  documentId,
  documentNo,
  legalEntityCode,
  branchId = null,
  workflowStatus,
  initialPdfAvailable = null,
  disabled = false,
  onPdfAvailableChange,
}: DocumentArchiveVaultActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(initialPdfAvailable)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePdfAvailable = useCallback(
    (next: boolean | null) => {
      setPdfAvailable(next)
      onPdfAvailableChange?.(next)
    },
    [onPdfAvailableChange]
  )

  useEffect(() => {
    updatePdfAvailable(initialPdfAvailable)
  }, [initialPdfAvailable, updatePdfAvailable])

  useEffect(() => {
    let cancelled = false
    void fetchDocumentArchivePdfStatus(legalEntityCode as DocumentEntityCode, {
      documentKind,
      documentId,
      documentNo,
      workflowStatus,
    })
      .then((status) => {
        if (!cancelled) updatePdfAvailable(status)
      })
      .catch(() => {
        // Keep server-provided initial state when status fetch is unavailable.
      })
    return () => {
      cancelled = true
    }
  }, [documentKind, documentId, documentNo, workflowStatus, updatePdfAvailable])

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
        updatePdfAvailable(status)
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
      uploading,
      updatePdfAvailable,
      workflowStatus,
    ]
  )

  const downloadHref = buildDocumentArchiveByDocumentDownloadPath(
    documentKind,
    documentId
  )

  const showUpload = pdfAvailable === false
  const showDownload = pdfAvailable === true

  if (!showUpload && !showDownload) {
    return null
  }

  return (
    <div
      className="no-print flex flex-wrap items-center gap-2"
      data-testid="document-archive-vault-actions"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        data-testid="document-archive-upload-input"
        onChange={(event) => void handleFileChange(event)}
      />
      {showUpload ? (
        <button
          type="button"
          className={actionButtonClass}
          disabled={disabled || uploading}
          onClick={handleUploadClick}
          data-testid="action-upload-pdf"
        >
          {uploading ? "Uploading…" : "Upload PDF"}
        </button>
      ) : null}
      {showDownload ? (
        <a
          href={downloadHref}
          className={actionButtonClass}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="action-download-pdf"
        >
          Download PDF
        </a>
      ) : null}
      {error ? (
        <p className={themeInlineError} data-testid="document-archive-upload-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
