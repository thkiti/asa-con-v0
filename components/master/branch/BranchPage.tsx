"use client"

import { useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import { masterPageLayout, masterShellNote } from "@/lib/master-ui/table-classes"
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

  return (
    <MasterPageShell
      title="Branch"
      description="Branch codes, names, HO/SH type, and active or deleted status."
    >
      <div className={masterPageLayout}>
        <p className={masterShellNote}>
          Step 1 shell — no list API yet. Bulk branch load: System Import → Branch.
        </p>

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

        <MasterTable
          columns={COLUMNS}
          isEmpty
          emptyMessage="List API coming in Step 2."
        />
      </div>
    </MasterPageShell>
  )
}
