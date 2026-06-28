"use client"

import { useEffect, useState } from "react"
import {
  formatPayInConfirmError,
  uploadPayInSlipEvidence,
} from "@/lib/finance-ui/pay-in-settlement"
import type { PayInVerifiedStaff } from "@/components/finance/PayInStaffCredentialGate"

export type PayInSlipUploadModalRow = {
  collectorReportId: string
  collectNo: string
  branchLabel: string
}

type PayInSlipUploadModalProps = {
  row: PayInSlipUploadModalRow | null
  verifiedStaff: PayInVerifiedStaff | null
  open: boolean
  onClose: () => void
  onSaved: () => void | Promise<void>
}

export function PayInSlipUploadModal({
  row,
  verifiedStaff,
  open,
  onClose,
  onSaved,
}: PayInSlipUploadModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPreviewUrl(null)
    setSelectedFile(null)
    setUploading(false)
    setError(null)
  }, [open, row?.collectorReportId])

  if (!open || !row || !verifiedStaff) return null

  async function handleSave() {
    if (!row || !verifiedStaff || !selectedFile) return
    setUploading(true)
    setError(null)
    try {
      await uploadPayInSlipEvidence({
        collectorReportId: row.collectorReportId,
        staffId: verifiedStaff.staffId,
        file: selectedFile,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(formatPayInConfirmError(err))
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    setSelectedFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
    setError(null)
  }

  const storageName = `${row.collectNo}-${verifiedStaff.staffId}.jpg`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="pay-in-slip-upload-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Upload PAY-IN slip"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Upload PAY-IN Slip</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {row.collectNo} · {row.branchLabel} · Staff {verifiedStaff.staffId}
        </p>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-zinc-600">Select or take photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading}
            data-testid="pay-in-slip-file-input"
            className="block w-full text-sm"
          />
        </label>

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="PAY-IN slip preview"
            className="mt-3 max-h-48 w-auto rounded border border-zinc-200"
            data-testid="pay-in-slip-modal-preview"
          />
        ) : null}

        <p className="mt-2 text-xs text-zinc-500" data-testid="pay-in-slip-storage-name">
          Save as: {storageName}
        </p>

        {error ? (
          <p
            className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            data-testid="pay-in-upload-error"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-zinc-300 px-4 py-2 text-sm"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="pay-in-slip-save-button"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!selectedFile || uploading}
            onClick={() => void handleSave()}
          >
            {uploading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
