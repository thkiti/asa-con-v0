"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import {
  BOOTSTRAP_SHOP_BRANCH_CODE,
  STAFF_BOOTSTRAP_ADMIN_ID,
} from "@/lib/import/constants"
import {
  createMasterStaff,
  fetchMasterBranches,
  fetchMasterStaff,
  patchMasterStaff,
} from "@/lib/master-ui/fetchers"
import { masterPageLayout, masterToolbarLabel } from "@/lib/master-ui/table-classes"
import type { BranchListItem, StaffListItem } from "@/lib/master/types"
import { themeBtnPrimary, themeSelect } from "@/lib/theme/theme-classes"
import { StaffConfirmDialog } from "./StaffConfirmDialog"
import { StaffFormModal, type StaffFormMode } from "./StaffFormModal"
import { StaffResetPasswordDialog } from "./StaffResetPasswordDialog"

const COLUMNS = [
  { key: "staffId", label: "Staff ID", width: "88px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "role", label: "Role", width: "120px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "status", label: "Status", width: "72px" },
  MASTER_ACTIONS_COLUMN,
] as const

const ROLE_OPTIONS = [
  "HO_FINANCE",
  "HO_ADMIN",
  "HO_OPERATIONS",
  "SH_STAFF",
] as const

export function StaffPage() {
  const [mode, setMode] = useState<"active" | "trash">("active")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [branchFilter, setBranchFilter] = useState("")
  const [branchOptions, setBranchOptions] = useState<BranchListItem[]>([])
  const [items, setItems] = useState<StaffListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<StaffFormMode>("create")
  const [selectedStaff, setSelectedStaff] = useState<StaffListItem | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"delete" | "restore">("delete")
  const [confirmPending, setConfirmPending] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const defaultBranchId = useMemo(
    () =>
      branchOptions.find((b) => b.code === BOOTSTRAP_SHOP_BRANCH_CODE)?.id ??
      branchOptions.find((b) => b.type === "SH")?.id ??
      branchOptions[0]?.id,
    [branchOptions]
  )

  useEffect(() => {
    fetchMasterBranches({ mode: "active", q: "" })
      .then((result) => setBranchOptions(result.items))
      .catch(() => setBranchOptions([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMasterStaff({
        mode,
        q: appliedSearch,
        role: roleFilter ? (roleFilter as StaffListItem["role"]) : null,
        branchCode: branchFilter,
      })
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }, [mode, appliedSearch, roleFilter, branchFilter])

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setFormMode("create")
    setSelectedStaff(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (row: StaffListItem) => {
    setFormMode("edit")
    setSelectedStaff(row)
    setFormError(null)
    setFormOpen(true)
  }

  const openDeleteConfirm = (row: StaffListItem) => {
    setSelectedStaff(row)
    setConfirmAction("delete")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const openRestoreConfirm = (row: StaffListItem) => {
    setSelectedStaff(row)
    setConfirmAction("restore")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const openResetPassword = (row: StaffListItem) => {
    setSelectedStaff(row)
    setResetError(null)
    setResetOpen(true)
  }

  const handleFormSubmit = async (values: {
    staffId: string
    name: string
    role: StaffListItem["role"]
    branchId: string
    password?: string
    posCanCollect: boolean
    allowAnyBranchLogin: boolean
  }) => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (formMode === "create") {
        await createMasterStaff(values)
      } else if (selectedStaff) {
        await patchMasterStaff(selectedStaff.id, {
          name: values.name,
          role: values.role,
          branchId: values.branchId,
          posCanCollect: values.posCanCollect,
          allowAnyBranchLogin: values.allowAnyBranchLogin,
        })
      }
      setFormOpen(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedStaff) return
    setConfirmPending(true)
    setConfirmError(null)
    try {
      if (confirmAction === "delete") {
        await patchMasterStaff(selectedStaff.id, { deleted: true })
      } else {
        await patchMasterStaff(selectedStaff.id, { deleted: false })
      }
      setConfirmOpen(false)
      await load()
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setConfirmPending(false)
    }
  }

  const handleResetPassword = async (password: string) => {
    if (!selectedStaff) return
    setResetPending(true)
    setResetError(null)
    try {
      await patchMasterStaff(selectedStaff.id, { password })
      setResetOpen(false)
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setResetPending(false)
    }
  }

  const trashMode = mode === "trash"

  return (
    <MasterPageShell
      title="Staff"
      description="Staff accounts, roles, and branch assignment. Passwords are stored as hashes only."
    >
      <div className={masterPageLayout}>
        <div className="mt-3">
          <MasterToolbar
            searchLabel="Search"
            searchPlaceholder="Staff ID or name…"
            searchValue={search}
            onSearchChange={setSearch}
            mode={mode}
            onModeChange={setMode}
            extraFilters={
              <>
                <label>
                  <span className={masterToolbarLabel}>Role</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`mt-0.5 w-full ${themeSelect}`}
                    aria-label="Role filter"
                  >
                    <option value="">All roles</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={masterToolbarLabel}>Branch</span>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className={`mt-0.5 w-full ${themeSelect}`}
                    aria-label="Branch filter"
                  >
                    <option value="">All branches</option>
                    {branchOptions.map((branch) => (
                      <option key={branch.id} value={branch.code}>
                        {branch.code} — {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            }
            actions={
              <button
                type="button"
                className={themeBtnPrimary}
                onClick={openCreate}
                disabled={trashMode}
                title={trashMode ? "Switch to Active to add staff" : undefined}
              >
                Add staff
              </button>
            }
          />
        </div>

        <MasterListStatus loading={loading} error={error} count={items.length} />

        <MasterTable columns={COLUMNS} isEmpty={!loading && !error && items.length === 0}>
          {items.map((row) => {
            const bootstrapAdmin = row.staffId === STAFF_BOOTSTRAP_ADMIN_ID
            const deleteDisabled = bootstrapAdmin
            const deleteTitle = bootstrapAdmin
              ? "Bootstrap admin cannot be deleted"
              : "Delete staff"

            return (
              <MasterTableRow
                key={row.id}
                cells={[
                  row.staffId,
                  <span key="name" title={row.name}>
                    {row.name}
                  </span>,
                  row.role,
                  row.branchCode,
                  row.deleted ? "Deleted" : "Active",
                ]}
                actions={
                  <MasterRowActions
                    trashMode={trashMode}
                    editTitle="Edit staff"
                    deleteTitle={deleteTitle}
                    editAriaLabel={`Edit staff ${row.staffId}`}
                    deleteAriaLabel={`Delete staff ${row.staffId}`}
                    restoreTitle="Restore staff"
                    restoreAriaLabel={`Restore staff ${row.staffId}`}
                    resetPasswordTitle="Reset password"
                    resetPasswordAriaLabel={`Reset password for ${row.staffId}`}
                    editDisabled={false}
                    deleteDisabled={deleteDisabled}
                    restoreDisabled={false}
                    resetPasswordDisabled={false}
                    onEdit={() => openEdit(row)}
                    onDelete={trashMode ? undefined : () => openDeleteConfirm(row)}
                    onRestore={trashMode ? () => openRestoreConfirm(row) : undefined}
                    onResetPassword={trashMode ? undefined : () => openResetPassword(row)}
                  />
                }
              />
            )
          })}
        </MasterTable>
      </div>

      <StaffFormModal
        open={formOpen}
        mode={formMode}
        staff={selectedStaff}
        branches={branchOptions}
        defaultBranchId={defaultBranchId}
        submitting={formSubmitting}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <StaffConfirmDialog
        open={confirmOpen}
        title={confirmAction === "delete" ? "Delete staff" : "Restore staff"}
        message={
          confirmAction === "delete"
            ? selectedStaff
              ? `Move ${selectedStaff.staffId} to trash? They cannot log in while deleted.`
              : ""
            : selectedStaff
              ? `Restore ${selectedStaff.staffId}? Login works again if branch is active.`
              : ""
        }
        confirmLabel={confirmAction === "delete" ? "Delete" : "Restore"}
        pending={confirmPending}
        error={confirmError}
        onClose={() => {
          if (!confirmPending) setConfirmOpen(false)
        }}
        onConfirm={() => void handleConfirm()}
      />

      <StaffResetPasswordDialog
        open={resetOpen}
        staffId={selectedStaff?.staffId ?? ""}
        submitting={resetPending}
        error={resetError}
        onClose={() => {
          if (!resetPending) setResetOpen(false)
        }}
        onConfirm={handleResetPassword}
      />
    </MasterPageShell>
  )
}
