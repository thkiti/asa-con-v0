"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"
import { masterPageLayout } from "@/lib/master-ui/table-classes"
import type { BankAccountRow } from "@/lib/finance/bank-account"
import {
  createBankAccount,
  deactivateBankAccount,
  fetchBankAccounts,
  formatBankAccountGlLabel,
  patchBankAccount,
} from "@/lib/finance-ui/bank-accounts"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"
import { BankAccountConfirmDialog } from "./BankAccountConfirmDialog"
import {
  BankAccountFilterBar,
  statusFilterToActiveFilter,
  type BankAccountFilterValues,
} from "./BankAccountFilterBar"
import { BankAccountFormModal, type BankAccountFormMode } from "./BankAccountFormModal"

const COLUMNS = [
  { key: "bankName", label: "Bank", width: "120px" },
  { key: "accountNumber", label: "Account No.", width: "120px" },
  { key: "accountName", label: "Account name", width: "160px" },
  { key: "currency", label: "Currency", width: "64px" },
  { key: "glAccount", label: "GL account", width: "160px" },
  { key: "active", label: "Active", width: "56px" },
  MASTER_ACTIONS_COLUMN,
] as const

export function BankAccountsPage() {
  const legalEntityCode = useFinanceLegalEntityScope()

  const [filterDraft, setFilterDraft] = useState<BankAccountFilterValues>({
    bankName: "",
    accountNumber: "",
    statusFilter: "active",
  })
  const [filterApplied, setFilterApplied] = useState(filterDraft)

  const [items, setItems] = useState<BankAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<BankAccountFormMode>("create")
  const [selectedAccount, setSelectedAccount] = useState<BankAccountRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "reactivate">("deactivate")
  const [confirmPending, setConfirmPending] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setFilterApplied(filterDraft), 300)
    return () => window.clearTimeout(timer)
  }, [filterDraft])

  const inactiveMode = filterApplied.statusFilter === "inactive"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchBankAccounts(
        legalEntityCode,
        statusFilterToActiveFilter(filterApplied.statusFilter)
      )
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load bank accounts")
    } finally {
      setLoading(false)
    }
  }, [filterApplied.statusFilter, legalEntityCode])

  useEffect(() => {
    void load()
  }, [load])

  const visibleItems = useMemo(() => {
    const bankQuery = filterApplied.bankName.trim().toLowerCase()
    const numberQuery = filterApplied.accountNumber.trim().toLowerCase()
    return items.filter((row) => {
      if (bankQuery && !row.bankName.toLowerCase().includes(bankQuery)) return false
      if (numberQuery && !row.accountNumber.toLowerCase().includes(numberQuery)) return false
      return true
    })
  }, [filterApplied.accountNumber, filterApplied.bankName, items])

  const openCreate = () => {
    setFormMode("create")
    setSelectedAccount(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (row: BankAccountRow) => {
    setFormMode("edit")
    setSelectedAccount(row)
    setFormError(null)
    setFormOpen(true)
  }

  const openDeactivateConfirm = (row: BankAccountRow) => {
    setSelectedAccount(row)
    setConfirmAction("deactivate")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const openReactivateConfirm = (row: BankAccountRow) => {
    setSelectedAccount(row)
    setConfirmAction("reactivate")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const handleFormSubmit = async (values: {
    bankName: string
    accountNumber: string
    accountName: string
    currencyCode: string
    glAccountCode: string
    isActive: boolean
  }) => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (formMode === "create") {
        await createBankAccount(legalEntityCode, values)
      } else if (selectedAccount) {
        await patchBankAccount(legalEntityCode, selectedAccount.id, values)
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
    if (!selectedAccount) return
    setConfirmPending(true)
    setConfirmError(null)
    try {
      if (confirmAction === "deactivate") {
        await deactivateBankAccount(legalEntityCode, selectedAccount.id)
      } else {
        await patchBankAccount(legalEntityCode, selectedAccount.id, { isActive: true })
      }
      setConfirmOpen(false)
      await load()
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setConfirmPending(false)
    }
  }

  return (
    <MasterPageShell
      title="Bank Accounts"
      documentEntityCode={legalEntityCode}
      backHref="/finance"
      backLabel="← Finance"
      description="External bank accounts mapped to GL bank accounts. Used by Bank Cash Journal and future reconciliation."
      headerActions={
        <button
          type="button"
          className={themeBtnPrimary}
          onClick={openCreate}
          disabled={inactiveMode}
          title={inactiveMode ? "Switch to Active filter to add a bank account" : undefined}
          data-testid="bank-account-add"
        >
          Add bank account
        </button>
      }
    >
      <div className={masterPageLayout}>
        <div className="mt-3">
          <BankAccountFilterBar
            values={filterDraft}
            onChange={(patch) => setFilterDraft((current) => ({ ...current, ...patch }))}
          />
        </div>

        <MasterListStatus loading={loading} error={error} count={visibleItems.length} />

        <MasterTable
          columns={COLUMNS}
          isEmpty={!loading && !error && visibleItems.length === 0}
        >
          {visibleItems.map((row) => (
            <MasterTableRow
              key={row.id}
              cells={[
                row.bankName,
                row.accountNumber,
                <span key="accountName" title={row.accountName}>
                  {row.accountName}
                </span>,
                row.currencyCode,
                <span key="gl" title={formatBankAccountGlLabel(row)}>
                  {formatBankAccountGlLabel(row)}
                </span>,
                row.isActive ? "Yes" : "No",
              ]}
              actions={
                <MasterRowActions
                  trashMode={inactiveMode}
                  editTitle="Edit bank account"
                  deleteTitle="Deactivate bank account"
                  editAriaLabel={`Edit bank account ${row.accountNumber}`}
                  deleteAriaLabel={`Deactivate bank account ${row.accountNumber}`}
                  restoreTitle="Reactivate bank account"
                  restoreAriaLabel={`Reactivate bank account ${row.accountNumber}`}
                  editDisabled={false}
                  deleteDisabled={!row.isActive}
                  restoreDisabled={false}
                  onEdit={() => openEdit(row)}
                  onDelete={inactiveMode ? undefined : () => openDeactivateConfirm(row)}
                  onRestore={inactiveMode ? () => openReactivateConfirm(row) : undefined}
                />
              }
            />
          ))}
        </MasterTable>
      </div>

      <BankAccountFormModal
        open={formOpen}
        mode={formMode}
        legalEntityCode={legalEntityCode}
        account={selectedAccount}
        submitting={formSubmitting}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <BankAccountConfirmDialog
        open={confirmOpen}
        title={
          confirmAction === "deactivate" ? "Deactivate bank account" : "Reactivate bank account"
        }
        message={
          confirmAction === "deactivate"
            ? selectedAccount
              ? `Deactivate ${selectedAccount.bankName} • ${selectedAccount.accountNumber}? It will be hidden from active lists and Bank Cash Journal pickers.`
              : ""
            : selectedAccount
              ? `Reactivate ${selectedAccount.bankName} • ${selectedAccount.accountNumber}?`
              : ""
        }
        confirmLabel={confirmAction === "deactivate" ? "Deactivate" : "Reactivate"}
        pending={confirmPending}
        error={confirmError}
        onClose={() => {
          if (!confirmPending) setConfirmOpen(false)
        }}
        onConfirm={() => void handleConfirm()}
      />
    </MasterPageShell>
  )
}
