"use client"

import QRCode from "react-qr-code"

type StaffEvidenceMobileQrPanelProps = {
  label: string
  loading: boolean
  error: string | null
  uploadUrl: string | null
  expiresAt: string | null
  onClose: () => void
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

export function StaffEvidenceMobileQrPanel({
  label,
  loading,
  error,
  uploadUrl,
  expiresAt,
  onClose,
}: StaffEvidenceMobileQrPanelProps) {
  return (
    <div
      className="mt-3 rounded-lg border border-zinc-300 bg-zinc-50 p-3"
      data-testid="pos-staff-evidence-mobile-qr-panel"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Upload {label}</p>
          <p className="text-xs text-zinc-600">Scan QR with phone to upload image</p>
        </div>
        <button
          type="button"
          className="rounded border border-zinc-300 px-2 py-1 text-xs"
          onClick={onClose}
        >
          ปิด
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-zinc-600">Preparing upload link…</p>
      ) : error ? (
        <p className="py-2 text-center text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : uploadUrl ? (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg bg-white p-2" data-testid="pos-staff-evidence-mobile-qr-code">
            <QRCode value={uploadUrl} size={180} />
          </div>
          {expiresAt ? (
            <p className="text-center text-xs text-zinc-500">
              Link expires {formatExpiresAt(expiresAt)}
            </p>
          ) : null}
          <p className="text-center text-xs text-zinc-600">Waiting for upload…</p>
        </div>
      ) : null}
    </div>
  )
}
