"use client"

import { useEffect, useState } from "react"
import {
  branchTaxIdFieldLabel,
  previewBranchCodeForTaxLabel,
} from "@/lib/master/parse-branch-contact"
import type { BranchListItem } from "@/lib/master/types"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeInput,
  themeMuted,
} from "@/lib/theme/theme-classes"

const BRANCH_TYPE_OPTIONS: BranchListItem["type"][] = ["HO", "SH"]

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

const fieldLabel = "text-xs text-muted-foreground"
const rowOneFieldClass = `mt-0.5 h-10 w-full ${themeInput}`

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
        className="w-full max-w-lg rounded-lg border border-border bg-card p-5 text-card-foreground shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="branch-form-title" className="text-lg font-semibold">
          {isEdit ? "Edit branch" : "Add branch"}
        </h2>

        <form
          className="mt-3 space-y-3"
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
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.25rem] gap-x-2 gap-y-1">
            <label className="block min-w-0">
              <span className={fieldLabel}>Code</span>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isEdit || submitting}
                readOnly={isEdit}
                className={rowOneFieldClass}
                placeholder={isEdit ? undefined : "SH002"}
                autoComplete="off"
              />
            </label>

            <label className="block min-w-0">
              <span className={fieldLabel}>Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting}
                className={rowOneFieldClass}
                required
              />
            </label>

            <label className="block min-w-0">
              <span className={fieldLabel}>Type</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as BranchListItem["type"])
                }
                disabled={isEdit || submitting}
                className={rowOneFieldClass}
              >
                {BRANCH_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {isEdit ? (
              <p className={`col-span-full text-xs ${themeMuted}`}>
                Code and type cannot be changed after creation.
              </p>
            ) : null}
          </div>

          <label className="block">
            <span className={fieldLabel}>Address</span>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              disabled={submitting}
              className={`mt-0.5 w-full ${themeInput}`}
            />
          </label>

          <div className="grid grid-cols-2 gap-x-2">
            <label className="block min-w-0">
              <span className={fieldLabel}>Phone</span>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={submitting}
                className={`mt-0.5 w-full ${themeInput}`}
              />
            </label>

            <label className="block min-w-0">
              <span className={fieldLabel}>{taxIdLabel}</span>
              <input
                type="text"
                value={taxId}
                onChange={(event) => setTaxId(event.target.value)}
                disabled={submitting}
                className={`mt-0.5 w-full ${themeInput}`}
                autoComplete="off"
              />
            </label>
          </div>

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

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
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
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
