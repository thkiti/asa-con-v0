"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import type { DocumentEntityCode } from "@/lib/legal-entity"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"
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
import { masterPageLayout } from "@/lib/master-ui/table-classes"
import type { BranchListItem, StaffListItem } from "@/lib/master/types"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"
import { StaffConfirmDialog } from "./StaffConfirmDialog"
import { StaffEvidenceBadgeCell } from "./StaffEvidenceBadgeCell"
import { StaffFormModal, type StaffFormMode } from "./StaffFormModal"
import {
  StaffFilterBar,
  refFilterToListMode,
  type StaffRefFilter,
} from "./StaffFilterBar"
import { StaffResetPasswordDialog } from "./StaffResetPasswordDialog"

const COLUMNS = [
  { key: "staffId", label: "Staff ID", width: "88px" },
  { key: "evidence", label: "Evidence", width: "52px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "role", label: "Role", width: "120px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "status", label: "Status", width: "72px" },
  MASTER_ACTIONS_COLUMN,
] as const

type StaffPageProps = {
  documentEntityCode: DocumentEntityCode
}

export function StaffPage({ documentEntityCode }: StaffPageProps) {
  const [refFilter, setRefFilter] = useState<StaffRefFilter>("all")
  const mode = refFilterToListMode(refFilter)
  const [staffId, setStaffId] = useState("")
  const [name, setName] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [branchFilter, setBranchFilter] = useState("")
  const [branchOptions, setBranchOptions] = useState<BranchListItem[]>([])

  const [applied, setApplied] = useState({
    staffId: "",
    name: "",
    role: "",
    branchCode: "",
  })

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
  const [evidenceRefreshKey, setEvidenceRefreshKey] = useState(0)

  const defaultBranchId = useMemo(
    () =>
      branchOptions.find((b) => b.code === BOOTSTRAP_SHOP_BRANCH_CODE)?.id ??
      branchOptions.find((b) => b.type === "SH")?.id ??
      branchOptions[0]?.id,
    [branchOptions]
  )

  useEffect(() => {
    fetchMasterBranches({ mode: "active", code: "", name: "", type: "", activeOnly: false })
      .then((result) => setBranchOptions(result.items))
      .catch(() => setBranchOptions([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setApplied({
          staffId: staffId.trim(),
          name: name.trim(),
          role: roleFilter.trim(),
          branchCode: branchFilter.trim(),
        }),
      300
    )
    return () => clearTimeout(timer)
  }, [staffId, name, roleFilter, branchFilter])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMasterStaff({
        mode,
        staffId: applied.staffId,
        name: applied.name,
        role: applied.role ? (applied.role as StaffListItem["role"]) : null,
        branchCode: applied.branchCode,
      })
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }, [mode, applied])

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
      setSelectedStaff(null)
      setFormError(null)
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
      documentEntityCode={documentEntityCode}
      description="Staff accounts, roles, and branch assignment. Passwords are stored as hashes only."
      headerActions={
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
    >
      <div className={masterPageLayout}>
        <div className="mt-3">
          <StaffFilterBar
            branchOptions={branchOptions}
            values={{
              staffId,
              name,
              role: roleFilter,
              branchCode: branchFilter,
              refFilter,
            }}
            onChange={(patch) => {
              if (patch.staffId !== undefined) setStaffId(patch.staffId)
              if (patch.name !== undefined) setName(patch.name)
              if (patch.role !== undefined) setRoleFilter(patch.role)
              if (patch.branchCode !== undefined) setBranchFilter(patch.branchCode)
              if (patch.refFilter !== undefined) setRefFilter(patch.refFilter)
            }}
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
                  <StaffEvidenceBadgeCell
                    key="evidence"
                    staffRowId={row.id}
                    staffCode={row.staffId}
                    photoUploaded={row.evidencePhotoUploaded ?? false}
                    idUploaded={row.evidenceIdUploaded ?? false}
                  />,
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
        evidenceRefreshKey={evidenceRefreshKey}
        onEvidenceChanged={() => {
          setEvidenceRefreshKey((key) => key + 1)
          void load()
        }}
        onEvidenceUploadSuccess={() => {
          setFormOpen(false)
          setSelectedStaff(null)
          setFormError(null)
          setEvidenceRefreshKey((key) => key + 1)
          void load()
        }}
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
