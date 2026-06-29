"use client"

import { useState } from "react"
import { parseStaffSlashPassword } from "@/lib/pos-ui/pos-staff-credential"
import { verifyPayInUploadStaffCredential } from "@/lib/finance-ui/pay-in-settlement"
import {
  themeDialogLight,
  themeDialogLightBody,
  themeDialogLightBtnPrimary,
  themeDialogLightBtnSecondary,
  themeDialogLightError,
  themeDialogLightInput,
  themeDialogLightLabel,
  themeDialogLightTitle,
  themeDialogOverlayCentered,
} from "@/lib/theme/theme-classes"

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

  const trimmedInput = staffInput.trim()
  const canSubmit = trimmedInput.length > 0 && !loading

  async function handleVerify(raw: string) {
    const parsed = parseStaffSlashPassword(raw)
    if (!parsed) {
      setError("Use staff code/password format, e.g. 001/password")
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    void handleVerify(trimmedInput)
  }

  return (
    <div
      className={themeDialogOverlayCentered}
      data-testid="pay-in-staff-credential-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-in-staff-credential-title"
    >
      <div className={themeDialogLight}>
        <h2 id="pay-in-staff-credential-title" className={themeDialogLightTitle}>
          Staff verification
        </h2>
        <p className={themeDialogLightBody}>
          Enter staff code/password to upload PAY-IN slip.
          <span className="mt-1 block font-mono text-[0.8125rem]">{collectNo}</span>
        </p>
        <form className="mt-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className={themeDialogLightLabel}>Staff code / password</span>
            <input
              type="password"
              autoFocus
              autoComplete="off"
              value={staffInput}
              disabled={loading}
              onChange={(event) => {
                setStaffInput(event.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. 001/password"
              data-testid="pay-in-staff-credential-input"
              className={themeDialogLightInput}
            />
          </label>
          {error ? (
            <p className={themeDialogLightError} data-testid="pay-in-staff-credential-error">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={themeDialogLightBtnSecondary}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={themeDialogLightBtnPrimary}
              disabled={!canSubmit}
              data-testid="pay-in-staff-verify-button"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
