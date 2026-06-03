"use client"

import { useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import { masterPageLayout, masterShellNote } from "@/lib/master-ui/table-classes"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"

const COLUMNS = [
  { key: "staffId", label: "Staff ID", width: "88px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "role", label: "Role", width: "120px" },
  { key: "branch", label: "Branch", width: "88px" },
  { key: "status", label: "Status", width: "72px" },
] as const

export function StaffPage() {
  const [mode, setMode] = useState<"active" | "trash">("active")
  const [search, setSearch] = useState("")

  return (
    <MasterPageShell
      title="Staff"
      description="Staff accounts with role and branch. Password reset is planned only — not implemented in Step 1."
    >
      <div className={masterPageLayout}>
        <p className={masterShellNote}>
          Step 1 shell — no list API yet. Bulk staff load: System Import → Staff.
        </p>

        <div className="mt-3">
          <MasterToolbar
            searchLabel="Search"
            searchPlaceholder="Staff ID or name…"
            searchValue={search}
            onSearchChange={setSearch}
            mode={mode}
            onModeChange={setMode}
            actions={
              <button type="button" className={themeBtnPrimary} disabled title="Coming in Step 4">
                Add staff
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
