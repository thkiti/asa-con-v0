"use client"

import { useEffect, useState } from "react"
import {
  branchTaxIdFieldLabel,
  previewBranchCodeForTaxLabel,
} from "@/lib/master/parse-branch-contact"
import type { BranchListItem } from "@/lib/master/types"
import { themeBtnPrimary, themeBtnSecondary, themeInput, themeMuted } from "@/lib/theme/theme-classes"

const BRANCH_TYPE_OPTIONS: { value: BranchListItem["type"]; label: string }[] = [
  { value: "HO", label: "HO — Head Office" },
  { value: "SH", label: "SH — Shop" },
]

export type BranchFormMode = "create" | "edit"

type BranchFormModalProps = {
  open: boolean
  mode: BranchFormMode
  branch?: BranchListItem | null
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: {
    code: string
    name: string
    type: BranchListItem["type"]
    isActive: boolean
    address: string | null
    phone: string | null
    taxId: string | null
  }) => Promise<void>
}

export function BranchFormModal({
  open,
  mode,
  branch,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: BranchFormModalProps) {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<BranchListItem["type"]>("SH")
  const [isActive, setIsActive] = useState(true)
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [taxId, setTaxId] = useState("")

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && branch) {
      setCode(branch.code)
      setName(branch.name)
      setType(branch.type)
      setIsActive(branch.isActive)
      setAddress(branch.address ?? "")
      setPhone(branch.phone ?? "")
      setTaxId(branch.taxId ?? "")
      return
    }
    setCode("")
    setName("")
    setType("SH")
    setIsActive(true)
    setAddress("")
    setPhone("")
    setTaxId("")
  }, [open, mode, branch])

  if (!open) return null

  const isEdit = mode === "edit"
  const trimmedName = name.trim()
  const trimmedCode = code.trim()
  const codeForTaxLabel = isEdit
    ? trimmedCode
    : previewBranchCodeForTaxLabel(trimmedCode, type)
  const taxIdLabel = branchTaxIdFieldLabel(codeForTaxLabel)
  const canSubmit =
    trimmedName.length > 0 &&
    (isEdit || trimmedCode.length > 0) &&
    !submitting

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="branch-form-title" className="text-lg font-semibold">
          {isEdit ? "Edit branch" : "Add branch"}
        </h2>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit) return
            void onSubmit({
              code: trimmedCode,
              name: trimmedName,
              type,
              isActive,
              address: address.trim() || null,
              phone: phone.trim() || null,
              taxId: taxId.trim() || null,
            })
          }}
        >
          <label className="block">
            <span className="text-sm text-muted-foreground">Code</span>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isEdit || submitting}
              readOnly={isEdit}
              className={themeInput}
              placeholder={isEdit ? undefined : "e.g. SH002 or 2"}
              autoComplete="off"
            />
            {isEdit ? (
              <span className={`mt-1 block text-xs ${themeMuted}`}>
                Code cannot be changed after creation.
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">Type</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as BranchListItem["type"])
              }
              disabled={isEdit || submitting}
              className={themeInput}
            >
              {BRANCH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isEdit ? (
              <span className={`mt-1 block text-xs ${themeMuted}`}>
                Type cannot be changed; create a new branch instead.
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              className={themeInput}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">Address</span>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              disabled={submitting}
              rows={2}
              className={themeInput}
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">Phone</span>
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={submitting}
              className={themeInput}
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">{taxIdLabel}</span>
            <input
              type="text"
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
              disabled={submitting}
              className={themeInput}
              autoComplete="off"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={submitting}
            />
            <span className="text-sm">Active</span>
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
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
            >
              {submitting ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
