"use client"

import { useEffect, useState } from "react"
import type { BranchListItem, StaffListItem } from "@/lib/master/types"
import { themeBtnPrimary, themeBtnSecondary, themeInput, themeMuted } from "@/lib/theme/theme-classes"

const ROLE_OPTIONS: { value: StaffListItem["role"]; label: string }[] = [
  { value: "HO_ADMIN", label: "HO_ADMIN" },
  { value: "HO_FINANCE", label: "HO_FINANCE" },
  { value: "HO_OPERATIONS", label: "HO_OPERATIONS" },
  { value: "SH_STAFF", label: "SH_STAFF" },
]

export type StaffFormMode = "create" | "edit"

type StaffFormModalProps = {
  open: boolean
  mode: StaffFormMode
  staff?: StaffListItem | null
  branches: BranchListItem[]
  defaultBranchId?: string
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: {
    staffId: string
    name: string
    role: StaffListItem["role"]
    branchId: string
    password?: string
  }) => Promise<void>
}

export function StaffFormModal({
  open,
  mode,
  staff,
  branches,
  defaultBranchId,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: StaffFormModalProps) {
  const [staffId, setStaffId] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<StaffListItem["role"]>("SH_STAFF")
  const [branchId, setBranchId] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && staff) {
      setStaffId(staff.staffId)
      setName(staff.name)
      setRole(staff.role)
      setBranchId(staff.branchId)
      setPassword("")
      return
    }
    setStaffId("")
    setName("")
    setRole("SH_STAFF")
    setBranchId(defaultBranchId ?? branches[0]?.id ?? "")
    setPassword("")
  }, [open, mode, staff, branches, defaultBranchId])

  if (!open) return null

  const isEdit = mode === "edit"
  const trimmedName = name.trim()
  const trimmedStaffId = staffId.trim()
  const canSubmit =
    trimmedName.length > 0 &&
    (isEdit || trimmedStaffId.length > 0) &&
    branchId.length > 0 &&
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
        aria-labelledby="staff-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="staff-form-title" className="text-lg font-semibold">
          {isEdit ? "Edit staff" : "Add staff"}
        </h2>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit) return
            void onSubmit({
              staffId: trimmedStaffId,
              name: trimmedName,
              role,
              branchId,
              password: isEdit ? undefined : password.trim() || undefined,
            })
          }}
        >
          <label className="block">
            <span className="text-sm text-muted-foreground">Staff ID</span>
            <input
              type="text"
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              disabled={isEdit || submitting}
              readOnly={isEdit}
              className={themeInput}
              autoComplete="off"
            />
            {isEdit ? (
              <span className={`mt-1 block text-xs ${themeMuted}`}>
                Staff ID cannot be changed after creation.
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
            <span className="text-sm text-muted-foreground">Role</span>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as StaffListItem["role"])
              }
              disabled={submitting}
              className={themeInput}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className={`mt-1 block text-xs ${themeMuted}`}>
              HO roles need an HO branch. SH_STAFF needs an SH branch. Role changes apply on next login.
            </span>
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">Branch</span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={submitting}
              className={themeInput}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} — {branch.name}
                </option>
              ))}
            </select>
          </label>

          {!isEdit ? (
            <label className="block">
              <span className="text-sm text-muted-foreground">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                className={themeInput}
                placeholder="Leave blank for default (1234)"
                autoComplete="new-password"
              />
            </label>
          ) : null}

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
            <button type="submit" disabled={!canSubmit} className={themeBtnPrimary}>
              {submitting ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
