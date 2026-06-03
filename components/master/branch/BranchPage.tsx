"use client"

import { useCallback, useEffect, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import { fetchMasterBranches } from "@/lib/master-ui/fetchers"
import { masterPageLayout } from "@/lib/master-ui/table-classes"
import type { BranchListItem } from "@/lib/master/types"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"

const COLUMNS = [
  { key: "code", label: "Code", width: "88px" },
  { key: "name", label: "Name", width: "200px" },
  { key: "type", label: "Type", width: "56px" },
  { key: "active", label: "Active", width: "56px" },
  { key: "status", label: "Status", width: "72px" },
] as const

export function BranchPage() {
  const [mode, setMode] = useState<"active" | "trash">("active")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [items, setItems] = useState<BranchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <MasterPageShell
      title="Branch"
      description="Branch codes, names, HO/SH type, and active or deleted status."
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
              <button type="button" className={themeBtnPrimary} disabled title="Coming in Step 4">
                Add branch
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
                row.code,
                <span key="name" title={row.name}>
                  {row.name}
                </span>,
                row.type,
                row.isActive ? "Yes" : "No",
                row.deleted ? "Deleted" : "Active",
              ]}
            />
          ))}
        </MasterTable>
      </div>
    </MasterPageShell>
  )
}
