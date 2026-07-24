"use client"

import { useEffect, useState } from "react"
import { GlAccountCombobox } from "@/components/finance/GlAccountCombobox"
import { ModalShell } from "@/components/ui/ModalShell"
import type { BankAccountRow } from "@/lib/finance/bank-account"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { formatEntityShort } from "@/lib/legal-entity/display"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeInput,
  themeMuted,
} from "@/lib/theme/theme-classes"

export type BankAccountFormMode = "create" | "edit"

type BankAccountFormModalProps = {
  open: boolean
  mode: BankAccountFormMode
  legalEntityCode: DocumentEntityCode
  account?: BankAccountRow | null
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: {
    bankName: string
    accountNumber: string
    accountName: string
    currencyCode: string
    glAccountCode: string
    isActive: boolean
  }) => Promise<void>
}

const fieldLabel = "text-xs text-muted-foreground"
const rowFieldClass = `mt-0.5 h-10 w-full ${themeInput}`

export function BankAccountFormModal({
  open,
  mode,
  legalEntityCode,
  account,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: BankAccountFormModalProps) {
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [currencyCode, setCurrencyCode] = useState("THB")
  const [glAccountCode, setGlAccountCode] = useState("")
  const [glAccountName, setGlAccountName] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && account) {
      setBankName(account.bankName)
      setAccountNumber(account.accountNumber)
      setAccountName(account.accountName)
      setCurrencyCode(account.currencyCode)
      setGlAccountCode(account.glAccount.code)
      setGlAccountName(account.glAccount.name)
      setIsActive(account.isActive)
      return
    }
    setBankName("")
    setAccountNumber("")
    setAccountName("")
    setCurrencyCode("THB")
    setGlAccountCode("")
    setGlAccountName("")
    setIsActive(true)
  }, [open, mode, account])

  const isEdit = mode === "edit"
  const trimmedBankName = bankName.trim()
  const trimmedAccountName = accountName.trim()
  const trimmedAccountNumber = accountNumber.trim()
  const trimmedGlCode = glAccountCode.trim()
  const canSubmit =
    trimmedBankName.length > 0 &&
    trimmedAccountName.length > 0 &&
    trimmedAccountNumber.length > 0 &&
    trimmedGlCode.length > 0 &&
    !submitting

  return (
    <ModalShell
      open={open}
      onClose={() => {
        if (!submitting) onClose()
      }}
      title={isEdit ? "Edit bank account" : "Add bank account"}
      titleId="bank-account-form-title"
      panelClassName="max-w-lg p-5"
      closeOnOverlayClick={!submitting}
      data-testid="bank-account-form-modal"
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          void onSubmit({
            bankName: trimmedBankName,
            accountNumber: trimmedAccountNumber,
            accountName: trimmedAccountName,
            currencyCode: currencyCode.trim().toUpperCase() || "THB",
            glAccountCode: trimmedGlCode,
            isActive,
          })
        }}
      >
          <div>
            <span className={fieldLabel}>Legal entity</span>
            <p className={`mt-0.5 text-sm font-medium ${themeMuted}`}>
              {formatEntityShort(legalEntityCode)}
            </p>
          </div>

          <label className="block">
            <span className={fieldLabel}>Bank name</span>
            <input
              type="text"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              className={rowFieldClass}
              autoComplete="off"
              data-testid="bank-account-form-bank-name"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Account number</span>
            <input
              type="text"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              className={rowFieldClass}
              autoComplete="off"
              data-testid="bank-account-form-account-number"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Account name</span>
            <input
              type="text"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className={rowFieldClass}
              autoComplete="off"
              data-testid="bank-account-form-account-name"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Currency</span>
            <input
              type="text"
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
              className={rowFieldClass}
              maxLength={3}
              autoComplete="off"
              data-testid="bank-account-form-currency"
            />
          </label>

          <GlAccountCombobox
            accountCode={glAccountCode}
            accountName={glAccountName}
            onAccountChange={(code, name) => {
              setGlAccountCode(code)
              setGlAccountName(name)
            }}
            label="Linked GL account"
            inputTestId="bank-account-form-gl-account"
            listTestId="bank-account-form-gl-account-list"
          />

          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              data-testid="bank-account-form-active"
            />
            <span className="text-sm">Active</span>
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={themeBtnSecondary}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={themeBtnPrimary}
            data-testid="bank-account-form-submit"
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Add bank account"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
