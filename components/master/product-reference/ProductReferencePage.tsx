"use client"

import { useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import { masterPageLayout, masterShellNote } from "@/lib/master-ui/table-classes"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"

const COLUMNS = [
  { key: "code", label: "Product code", width: "110px" },
  { key: "name", label: "Product name", width: "180px" },
  { key: "hook", label: "Hook", width: "72px" },
  { key: "supplier", label: "Supplier", width: "72px" },
  { key: "refCode", label: "Ref code", width: "100px" },
  { key: "group", label: "Group", width: "80px" },
  { key: "type", label: "Type", width: "88px" },
] as const

export function ProductReferencePage() {
  const [mode, setMode] = useState<"active" | "trash">("active")
  const [hookGroup, setHookGroup] = useState("")
  const [hookNo, setHookNo] = useState("")
  const [productCode, setProductCode] = useState("")

  return (
    <MasterPageShell
      title="Product & Reference Stock"
      description="Search products and hook reference links. List data will load when maintenance APIs are available."
    >
      <div className={masterPageLayout}>
        <p className={masterShellNote}>
          Step 1 shell — no list API yet. Use System Import for bulk product and reference
          stock loads.
        </p>

        <div className="mt-3">
          <MasterToolbar
            searchLabel="Product code (7 digits)"
            searchPlaceholder="e.g. 5101001"
            searchValue={productCode}
            onSearchChange={setProductCode}
            mode={mode}
            onModeChange={setMode}
            extraFilters={
              <>
                <label>
                  <span className="text-xs font-medium text-muted-foreground">Hook group</span>
                  <input
                    type="text"
                    maxLength={1}
                    value={hookGroup}
                    onChange={(e) => setHookGroup(e.target.value)}
                    placeholder="G"
                    className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                    aria-label="Hook group"
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-muted-foreground">Hook no</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={hookNo}
                    onChange={(e) => setHookNo(e.target.value)}
                    placeholder="001"
                    className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                    aria-label="Hook number"
                  />
                </label>
              </>
            }
            actions={
              <button type="button" className={themeBtnPrimary} disabled title="Coming in Step 3">
                Add / Edit link
              </button>
            }
          />
        </div>

        <MasterTable
          columns={COLUMNS}
          isEmpty
          emptyMessage="List API coming in Step 2. Filters above are wired for layout only."
        />
      </div>
    </MasterPageShell>
  )
}
