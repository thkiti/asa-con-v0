"use client"

import { useState } from "react"
import { parseStaffSlashPassword } from "@/lib/pos-ui/pos-staff-credential"
import { verifyPayInUploadStaffCredential } from "@/lib/finance-ui/pay-in-settlement"

export type PayInVerifiedStaff = {
  staffId: string
  staffName: string
}

type PayInStaffCredentialGateProps = {
  open: boolean
  collectNo: string
  onClose: () => void
  onVerified: (staff: PayInVerifiedStaff) => void
}

export function PayInStaffCredentialGate({
  open,
  collectNo,
  onClose,
  onVerified,
}: PayInStaffCredentialGateProps) {
  const [staffInput, setStaffInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleVerify(raw: string) {
    const parsed = parseStaffSlashPassword(raw)
    if (!parsed) {
      setError("Use staff code/password format, e.g. 001/password, then press Enter")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await verifyPayInUploadStaffCredential({
        staffId: parsed.staffCode,
        password: parsed.password,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onVerified({
        staffId: result.staffId,
        staffName: result.staffName,
      })
      setStaffInput("")
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStaffInput("")
    setError(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="pay-in-staff-credential-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Staff verification for PAY-IN upload"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-900">Staff verification</h2>
        <p className="mt-1 text-xs text-zinc-600">
          PAY-IN slip for <span className="font-mono">{collectNo}</span> — enter{" "}
          <span className="font-mono">staff code/password</span> then press Enter.
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={staffInput}
          disabled={loading}
          onChange={(event) => setStaffInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || loading) return
            event.preventDefault()
            const raw = staffInput.trim()
            if (!raw) return
            void handleVerify(raw)
          }}
          placeholder="e.g. 001/password"
          data-testid="pay-in-staff-credential-input"
          className="mt-3 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        {error ? (
          <p className="mt-2 text-xs text-red-700" data-testid="pay-in-staff-credential-error">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
