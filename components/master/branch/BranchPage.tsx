"use client"

import { useCallback, useEffect, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import type { DocumentEntityCode } from "@/lib/legal-entity"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import {
  createMasterBranch,
  fetchMasterBranches,
  patchMasterBranch,
} from "@/lib/master-ui/fetchers"
import { masterPageLayout } from "@/lib/master-ui/table-classes"
import type { BranchListItem } from "@/lib/master/types"
import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
} from "@/lib/import/constants"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"
import { BranchConfirmDialog } from "./BranchConfirmDialog"
import { BranchFormModal, type BranchFormMode } from "./BranchFormModal"

const COLUMNS = [
  { key: "code", label: "Code", width: "88px" },
  { key: "name", label: "Name", width: "200px" },
  { key: "type", label: "Type", width: "56px" },
  { key: "active", label: "Active", width: "56px" },
  MASTER_ACTIONS_COLUMN,
] as const

const BOOTSTRAP_CODES = new Set([
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
])

function isBootstrapBranch(code: string): boolean {
  return BOOTSTRAP_CODES.has(code)
}

export function BranchPage({ documentEntityCode }: { documentEntityCode: DocumentEntityCode }) {
  const [mode, setMode] = useState<"active" | "trash">("active")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [items, setItems] = useState<BranchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<BranchFormMode>("create")
  const [selectedBranch, setSelectedBranch] = useState<BranchListItem | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"delete" | "restore">("delete")
  const [confirmPending, setConfirmPending] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMasterBranches({ mode, q: appliedSearch })
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load branches")
    } finally {
      setLoading(false)
    }
  }, [mode, appliedSearch])

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setFormMode("create")
    setSelectedBranch(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (row: BranchListItem) => {
    setFormMode("edit")
    setSelectedBranch(row)
    setFormError(null)
    setFormOpen(true)
  }

  const openDeleteConfirm = (row: BranchListItem) => {
    setSelectedBranch(row)
    setConfirmAction("delete")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const openRestoreConfirm = (row: BranchListItem) => {
    setSelectedBranch(row)
    setConfirmAction("restore")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const handleFormSubmit = async (values: {
    code: string
    name: string
    type: BranchListItem["type"]
    isActive: boolean
    address: string | null
    phone: string | null
    taxId: string | null
  }) => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (formMode === "create") {
        await createMasterBranch(values)
      } else if (selectedBranch) {
        await patchMasterBranch(selectedBranch.id, {
          name: values.name,
          isActive: values.isActive,
          address: values.address,
          phone: values.phone,
          taxId: values.taxId,
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
    if (!selectedBranch) return
    setConfirmPending(true)
    setConfirmError(null)
    try {
      if (confirmAction === "delete") {
        await patchMasterBranch(selectedBranch.id, { deleted: true })
      } else {
        await patchMasterBranch(selectedBranch.id, { deleted: false })
      }
      setConfirmOpen(false)
      await load()
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setConfirmPending(false)
    }
  }

  const trashMode = mode === "trash"

  return (
    <MasterPageShell
      title="Branch"
      documentEntityCode={documentEntityCode}
      description="Branch codes, names, HO/SH type, and active status. Address, phone, and tax ID are edited in the branch form."
    >
      <div className={masterPageLayout}>
        <div className="mt-3">
          <MasterToolbar
            searchLabel="Search"
            searchPlaceholder="Code or name…"
            searchValue={search}
            onSearchChange={setSearch}
            mode={mode}
            onModeChange={setMode}
            actions={
              <button
                type="button"
                className={themeBtnPrimary}
                onClick={openCreate}
                disabled={trashMode}
                title={trashMode ? "Switch to Active to add a branch" : undefined}
              >
                Add branch
              </button>
            }
          />
        </div>

        <MasterListStatus loading={loading} error={error} count={items.length} />

        <MasterTable columns={COLUMNS} isEmpty={!loading && !error && items.length === 0}>
          {items.map((row) => {
            const bootstrap = isBootstrapBranch(row.code)
            const deleteDisabled = bootstrap
            const deleteTitle = bootstrap
              ? "Bootstrap branch cannot be deleted"
              : "Delete branch"

            return (
              <MasterTableRow
                key={row.id}
                cells={[
                  row.code,
                  <span key="name" title={row.name}>
                    {row.name}
                  </span>,
                  row.type,
                  row.isActive ? "Yes" : "No",
                ]}
                actions={
                  <MasterRowActions
                    trashMode={trashMode}
                    editTitle="Edit branch"
                    deleteTitle={deleteTitle}
                    editAriaLabel={`Edit branch ${row.code}`}
                    deleteAriaLabel={`Delete branch ${row.code}`}
                    restoreTitle="Restore branch"
                    restoreAriaLabel={`Restore branch ${row.code}`}
                    editDisabled={false}
                    deleteDisabled={deleteDisabled}
                    restoreDisabled={false}
                    onEdit={() => openEdit(row)}
                    onDelete={trashMode ? undefined : () => openDeleteConfirm(row)}
                    onRestore={trashMode ? () => openRestoreConfirm(row) : undefined}
                  />
                }
              />
            )
          })}
        </MasterTable>
      </div>

      <BranchFormModal
        open={formOpen}
        mode={formMode}
        branch={selectedBranch}
        submitting={formSubmitting}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <BranchConfirmDialog
        open={confirmOpen}
        title={confirmAction === "delete" ? "Delete branch" : "Restore branch"}
        message={
          confirmAction === "delete"
            ? selectedBranch
              ? `Move ${selectedBranch.code} to trash? Code and type stay unchanged; you can restore later. Active status is preserved.`
              : ""
            : selectedBranch
              ? `Restore ${selectedBranch.code}? Only deleted flag is cleared; active status stays as-is.`
              : ""
        }
        confirmLabel={confirmAction === "delete" ? "Delete" : "Restore"}
        pending={confirmPending}
        onClose={() => {
          if (!confirmPending) setConfirmOpen(false)
        }}
        error={confirmError}
        onConfirm={() => void handleConfirm()}
      />
    </MasterPageShell>
  )
}
