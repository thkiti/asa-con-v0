"use client"

import { useCallback, useEffect, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import { fetchMasterBranches, fetchMasterStaff } from "@/lib/master-ui/fetchers"
import { masterPageLayout, masterToolbarLabel } from "@/lib/master-ui/table-classes"
import type { BranchListItem, StaffListItem } from "@/lib/master/types"
import { themeBtnPrimary, themeSelect } from "@/lib/theme/theme-classes"

const COLUMNS = [
  { key: "staffId", label: "Staff ID", width: "88px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "role", label: "Role", width: "120px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "status", label: "Status", width: "72px" },
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

  return (
    <MasterPageShell
      title="Staff"
      description="Staff accounts with role and branch. Read-only — password reset not available."
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
              <button type="button" className={themeBtnPrimary} disabled title="Coming in Step 4">
                Add staff
              </button>
            }
          />
        </div>

        <MasterListStatus loading={loading} error={error} count={items.length} />

        <MasterTable columns={COLUMNS} isEmpty={!loading && !error && items.length === 0}>
          {items.map((row) => (
            <MasterTableRow
              key={row.id}
              cells={[
                row.staffId,
                <span key="name" title={row.name}>
                  {row.name}
                </span>,
                row.role,
                `${row.branchCode}`,
                row.deleted ? "Deleted" : "Active",
              ]}
            />
          ))}
        </MasterTable>
      </div>
    </MasterPageShell>
  )
}
