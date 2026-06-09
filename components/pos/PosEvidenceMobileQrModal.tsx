"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"
import { fetchPaymentEvidenceMobileLink } from "@/lib/pos-ui/payment-evidence-mobile-link-client"
import type { PendingPaymentEvidenceRow } from "@/lib/pos/pending-payment-evidence-types"

type PosEvidenceMobileQrModalProps = {
  row: PendingPaymentEvidenceRow
  branchCode: string
  branchName: string
  onClose: () => void
}

function formatMoney(value: string): string {
  const n = Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatExpiresAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function PosEvidenceMobileQrModal({
  row,
  branchCode,
  branchName,
  onClose,
}: PosEvidenceMobileQrModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const result = await fetchPaymentEvidenceMobileLink({
        receiptNo: row.receiptNo,
      })
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setUploadUrl(result.uploadUrl)
      setExpiresAt(result.expiresAt)
    })()
    return () => {
      cancelled = true
    }
  }, [row.receiptNo])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 sm:p-4"
      data-testid="pos-evidence-mobile-qr-modal"
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-600 bg-zinc-900 p-4 text-white shadow-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Mobile Upload</h3>
            <p className="mt-1 text-sm text-zinc-300">
              Scan the QR code with a phone to upload the bank transfer slip.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-zinc-500 bg-zinc-800 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-700"
          >
            Close
          </button>
        </header>

        <div
          className="mb-4 space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-3 text-sm"
          data-testid="pos-evidence-mobile-qr-details"
        >
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Receipt No</span>
            <span className="font-mono text-xs">{row.receiptNo}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Shop</span>
            <span className="text-right">
              {branchCode}
              {branchName ? ` — ${branchName}` : ""}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Amount</span>
            <span className="tabular-nums font-semibold">
              {formatMoney(row.total)}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-300">
            Preparing upload link…
          </p>
        ) : error ? (
          <p className="py-4 text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : uploadUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="rounded-lg bg-white p-3"
              data-testid="pos-evidence-mobile-qr-code"
            >
              <QRCode value={uploadUrl} size={220} />
            </div>
            {expiresAt ? (
              <p className="text-center text-xs text-zinc-400">
                Link expires {formatExpiresAt(expiresAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
