"use client"

import { useEffect, useState } from "react"
import type { BranchListItem, StaffListItem } from "@/lib/master/types"
import { themeBtnPrimary, themeBtnSecondary, themeInput, themeMuted } from "@/lib/theme/theme-classes"
import { StaffEvidenceSection } from "./StaffEvidenceSection"

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
  evidenceRefreshKey?: number
  onEvidenceChanged?: () => void
  onEvidenceUploadSuccess?: () => void
  onSubmit: (values: {
    staffId: string
    name: string
    role: StaffListItem["role"]
    branchId: string
    password?: string
    posCanCollect: boolean
    allowAnyBranchLogin: boolean
  }) => Promise<void>
}

const fieldLabel = "text-xs text-muted-foreground"
const fieldClass = `mt-0.5 h-10 w-full ${themeInput}`
const rowOneFieldClass = fieldClass

export function StaffFormModal({
  open,
  mode,
  staff,
  branches,
  defaultBranchId,
  submitting = false,
  error,
  onClose,
  evidenceRefreshKey = 0,
  onEvidenceChanged,
  onEvidenceUploadSuccess,
  onSubmit,
}: StaffFormModalProps) {
  const [staffId, setStaffId] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<StaffListItem["role"]>("SH_STAFF")
  const [branchId, setBranchId] = useState("")
  const [password, setPassword] = useState("")
  const [posCanCollect, setPosCanCollect] = useState(false)
  const [allowAnyBranchLogin, setAllowAnyBranchLogin] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && staff) {
      setStaffId(staff.staffId)
      setName(staff.name)
      setRole(staff.role)
      setBranchId(staff.branchId)
      setPosCanCollect(staff.role === "SH_STAFF" ? false : staff.posCanCollect)
      setAllowAnyBranchLogin(staff.allowAnyBranchLogin)
      setPassword("")
      return
    }
    setStaffId("")
    setName("")
    setRole("SH_STAFF")
    setBranchId(defaultBranchId ?? branches[0]?.id ?? "")
    setPosCanCollect(false)
    setAllowAnyBranchLogin(false)
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
        className="w-full max-w-lg rounded-lg border border-border bg-card p-5 text-card-foreground shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="staff-form-title" className="text-lg font-semibold">
          {isEdit ? "Edit staff" : "Add staff"}
        </h2>

        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit) return
            void (async () => {
              await onSubmit({
                staffId: trimmedStaffId,
                name: trimmedName,
                role,
                branchId,
                password: isEdit ? undefined : password.trim() || undefined,
                posCanCollect: role === "SH_STAFF" ? false : posCanCollect,
                allowAnyBranchLogin:
                  role === "SH_STAFF" ? allowAnyBranchLogin : false,
              })
            })()
          }}
        >
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1">
            <label className="block min-w-0">
              <span className={fieldLabel}>Staff ID</span>
              <input
                type="text"
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                disabled={isEdit || submitting}
                readOnly={isEdit}
                className={rowOneFieldClass}
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

            {isEdit ? (
              <p className={`col-span-full text-xs ${themeMuted}`}>
                Staff ID cannot be changed after creation.
              </p>
            ) : null}
          </div>

          <label className="block">
            <span className={fieldLabel}>Role</span>
            <select
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value as StaffListItem["role"]
                setRole(nextRole)
                if (nextRole !== "SH_STAFF") {
                  setAllowAnyBranchLogin(false)
                } else {
                  setPosCanCollect(false)
                }
              }}
              disabled={submitting}
              className={fieldClass}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className={`mt-1 block text-xs ${themeMuted}`}>
              HO roles need an HO branch. SH_STAFF needs an SH branch. Role changes apply on next
              login.
            </span>
          </label>

          <label className="block">
            <span className={fieldLabel}>Branch</span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={submitting}
              className={fieldClass}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} — {branch.name}
                </option>
              ))}
            </select>
          </label>

          {role !== "SH_STAFF" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={posCanCollect}
                onChange={(event) => setPosCanCollect(event.target.checked)}
                disabled={submitting}
              />
              <span className="text-sm text-muted-foreground">
                Collector (POS cash collection report)
              </span>
            </label>
          ) : null}

          {role === "SH_STAFF" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowAnyBranchLogin}
                onChange={(event) => setAllowAnyBranchLogin(event.target.checked)}
                disabled={submitting}
              />
              <span className="text-sm text-muted-foreground">
                Replacer / พนักงานแทน
              </span>
            </label>
          ) : null}

          {!isEdit ? (
            <label className="block">
              <span className={fieldLabel}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                className={fieldClass}
                placeholder="Leave blank for default (1234)"
                autoComplete="new-password"
              />
            </label>
          ) : null}

          {isEdit && staff ? (
            <StaffEvidenceSection
              staffRowId={staff.id}
              staffCode={staff.staffId}
              refreshKey={evidenceRefreshKey}
              onEvidenceChanged={onEvidenceChanged}
              onUploadSuccess={onEvidenceUploadSuccess}
            />
          ) : null}

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
            <button type="submit" disabled={!canSubmit} className={themeBtnPrimary}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
