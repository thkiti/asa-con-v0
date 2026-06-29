"use client"

import { useEffect, useState } from "react"
import {
  formatPayInConfirmError,
  uploadPayInSlipEvidence,
} from "@/lib/finance-ui/pay-in-settlement"
import type { PayInVerifiedStaff } from "@/components/finance/PayInStaffCredentialGate"
import {
  themeDialogLightWide,
  themeDialogLightBody,
  themeDialogLightBtnPrimary,
  themeDialogLightBtnSecondary,
  themeDialogLightLabel,
  themeDialogLightTitleLg,
  themeDialogOverlayCentered,
  themeBannerError,
} from "@/lib/theme/theme-classes"

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
      className={themeDialogOverlayCentered}
      data-testid="pay-in-slip-upload-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Upload PAY-IN slip"
    >
      <div className={themeDialogLightWide}>
        <h2 className={themeDialogLightTitleLg}>Upload PAY-IN Slip</h2>
        <p className={themeDialogLightBody}>
          {row.collectNo} · {row.branchLabel} · Staff {verifiedStaff.staffId}
        </p>

        <label className="mt-4 block">
          <span className={themeDialogLightLabel}>Select or take photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading}
            data-testid="pay-in-slip-file-input"
            className="theme-dialog-light-input block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-[#f4f4f5] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#18181b]"
          />
        </label>

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="PAY-IN slip preview"
            className="mt-3 max-h-48 w-auto rounded border border-[#d4d4d8]"
            data-testid="pay-in-slip-modal-preview"
          />
        ) : null}

        <p
          className="theme-dialog-light-body mt-2 text-xs"
          data-testid="pay-in-slip-storage-name"
        >
          Save as: {storageName}
        </p>

        {error ? (
          <p className={`mt-3 ${themeBannerError}`} data-testid="pay-in-upload-error">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={themeDialogLightBtnSecondary}
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="pay-in-slip-save-button"
            className={themeDialogLightBtnPrimary}
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
