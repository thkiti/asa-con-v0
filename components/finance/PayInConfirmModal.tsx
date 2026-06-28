"use client"

import { useEffect, useMemo, useState } from "react"
import { FinanceSettlementDateInput } from "@/components/finance/FinanceSettlementDateInput"
import { DEFAULT_BANK_ACCOUNT_CODE } from "@/lib/finance-ui/pos-settlement-constants"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  confirmPayInSettlement,
  formatPayInConfirmError,
  uploadPayInSlipEvidence,
} from "@/lib/finance-ui/pay-in-settlement"
import {
  isPayInEvidenceUploadedStatus,
  type PayInEvidenceUiStatus,
} from "@/lib/finance-ui/pay-in-display"

export type PayInConfirmModalRow = {
  collectorReportId: string
  collectNo: string
  branchLabel: string
  inTransitAmount: string
  payInEvidenceStatus: PayInEvidenceUiStatus
  payInEvidenceUrl: string | null
}

type PayInConfirmModalProps = {
  row: PayInConfirmModalRow | null
  open: boolean
  onClose: () => void
  onConfirmed: () => void | Promise<void>
}

function defaultDepositDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PayInConfirmModal({
  row,
  open,
  onClose,
  onConfirmed,
}: PayInConfirmModalProps) {
  const [bankDepositDate, setBankDepositDate] = useState(defaultDepositDate())
  const [bankAccountCode, setBankAccountCode] = useState(DEFAULT_BANK_ACCOUNT_CODE)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [evidenceStatus, setEvidenceStatus] = useState<PayInEvidenceUiStatus>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !row) return
    setBankDepositDate(defaultDepositDate())
    setBankAccountCode(DEFAULT_BANK_ACCOUNT_CODE)
    setPreviewUrl(row.payInEvidenceUrl)
    setEvidenceStatus(row.payInEvidenceStatus)
    setUploading(false)
    setConfirming(false)
    setError(null)
  }, [open, row])

  const hasSlipEvidence = isPayInEvidenceUploadedStatus(evidenceStatus)
  const canConfirm = hasSlipEvidence && !uploading && !confirming

  const branchLabel = useMemo(() => row?.branchLabel ?? "—", [row])

  if (!open || !row) return null

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !row) return

    setUploading(true)
    setError(null)
    try {
      const localPreview = URL.createObjectURL(file)
      setPreviewUrl(localPreview)
      const result = await uploadPayInSlipEvidence(row.collectorReportId, file)
      setEvidenceStatus(result.status)
      setPreviewUrl(result.blobUrl)
    } catch (err) {
      setError(formatPayInConfirmError(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirm() {
    if (!row || !canConfirm) return
    setConfirming(true)
    setError(null)
    try {
      await confirmPayInSettlement({
        collectorReportId: row.collectorReportId,
        bankDepositDate,
        bankAccountCode,
      })
      await onConfirmed()
      onClose()
    } catch (err) {
      setError(formatPayInConfirmError(err))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="pay-in-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm PAY-IN"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Confirm PAY-IN</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Upload the bank pay-in slip, then confirm bank deposit posting.
        </p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Collect No</dt>
          <dd className="font-mono">{row.collectNo}</dd>
          <dt className="text-zinc-500">Branch</dt>
          <dd>{branchLabel}</dd>
          <dt className="text-zinc-500">In Transit</dt>
          <dd className="tabular-nums">{formatAmount(row.inTransitAmount)}</dd>
        </dl>

        <div className="mt-4 space-y-3">
          <FinanceSettlementDateInput
            label="Bank deposit date"
            value={bankDepositDate}
            onChange={setBankDepositDate}
            data-testid="pay-in-bank-deposit-date"
          />

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">Bank account</span>
            <input
              type="text"
              value={bankAccountCode}
              onChange={(event) => setBankAccountCode(event.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
              data-testid="pay-in-bank-account"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">PAY-IN slip</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading || confirming}
              data-testid="pay-in-slip-file-input"
              className="block w-full text-sm"
            />
          </label>

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="PAY-IN slip preview"
              className="max-h-48 w-auto rounded border border-zinc-200"
              data-testid="pay-in-slip-modal-preview"
            />
          ) : (
            <p className="text-xs text-zinc-500">No slip uploaded yet.</p>
          )}
        </div>

        {error ? (
          <p
            className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            data-testid="pay-in-confirm-error"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-zinc-300 px-4 py-2 text-sm"
            onClick={onClose}
            disabled={confirming}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="pay-in-confirm-button"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
          >
            {confirming ? "Confirming…" : uploading ? "Uploading…" : "Confirm PAY-IN"}
          </button>
        </div>
      </div>
    </div>
  )
}
