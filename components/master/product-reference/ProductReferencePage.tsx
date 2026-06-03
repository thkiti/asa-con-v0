"use client"

import { useCallback, useEffect, useState } from "react"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"
import { MasterToolbar } from "@/components/master/shared/MasterToolbar"
import { fetchMasterProductReference } from "@/lib/master-ui/fetchers"
import { masterPageLayout, masterToolbarLabel } from "@/lib/master-ui/table-classes"
import type {
  ProductReferenceListItem,
  ReferenceStatusFilter,
} from "@/lib/master/types"
import { themeBtnPrimary, themeSelect } from "@/lib/theme/theme-classes"

const COLUMNS = [
  { key: "code", label: "Product code", width: "110px" },
  { key: "name", label: "Product name", width: "180px" },
  { key: "hook", label: "Hook", width: "72px" },
  { key: "supplier", label: "Supplier", width: "72px" },
  { key: "refCode", label: "Ref code", width: "100px" },
  { key: "group", label: "Group", width: "80px" },
  { key: "type", label: "Type", width: "88px" },
  MASTER_ACTIONS_COLUMN,
] as const

function formatHookLabel(row: ProductReferenceListItem): string {
  if (!row.hookGroup) return ""
  if (row.hookNo == null) return row.hookGroup
  return `${row.hookGroup}.${row.hookNo}`
}

export function ProductReferencePage() {
  const [mode, setMode] = useState<"active" | "trash">("active")
  const [productCode, setProductCode] = useState("")
  const [productName, setProductName] = useState("")
  const [hookGroup, setHookGroup] = useState("")
  const [hookNo, setHookNo] = useState("")
  const [supplierCode, setSupplierCode] = useState("")
  const [productGroup, setProductGroup] = useState("")
  const [referenceStatus, setReferenceStatus] = useState<ReferenceStatusFilter>("all")

  const [applied, setApplied] = useState({
    productCode: "",
    productName: "",
    hookGroup: "",
    hookNo: "",
    supplierCode: "",
    productGroup: "",
  })

  const [items, setItems] = useState<ProductReferenceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setApplied({
          productCode: productCode.trim(),
          productName: productName.trim(),
          hookGroup: hookGroup.trim(),
          hookNo: hookNo.trim(),
          supplierCode: supplierCode.trim(),
          productGroup: productGroup.trim(),
        }),
      300
    )
    return () => clearTimeout(timer)
  }, [productCode, productName, hookGroup, hookNo, supplierCode, productGroup])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMasterProductReference({
        mode,
        ...applied,
        referenceStatus,
      })
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load product reference")
    } finally {
      setLoading(false)
    }
  }, [mode, applied, referenceStatus])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <MasterPageShell
      title="Product & Reference Stock"
      description="Search products and hook reference links. Product code, supplier, and group use prefix match from the start; hook group/no are exact. Read-only."
    >
      <div className={masterPageLayout}>
        <div className="mt-3 space-y-2">
          <MasterToolbar
            searchLabel="Product code"
            searchPlaceholder="Starts with, e.g. 5101"
            searchValue={productCode}
            onSearchChange={setProductCode}
            mode={mode}
            onModeChange={setMode}
            extraFilters={
              <>
                <label>
                  <span className={masterToolbarLabel}>Product name</span>
                  <input
                    type="search"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Name…"
                    className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                    aria-label="Product name"
                  />
                </label>
                <label>
                  <span className={masterToolbarLabel}>Hook group</span>
                  <input
                    type="text"
                    maxLength={1}
                    value={hookGroup}
                    onChange={(e) => setHookGroup(e.target.value)}
                    placeholder="Exact, e.g. K"
                    className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                    aria-label="Hook group (exact)"
                  />
                </label>
                <label>
                  <span className={masterToolbarLabel}>Hook no</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={hookNo}
                    onChange={(e) => setHookNo(e.target.value)}
                    placeholder="Exact, e.g. 12"
                    className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                    aria-label="Hook number (exact)"
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

          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:items-end">
            <label>
              <span className={masterToolbarLabel}>Supplier code</span>
              <input
                type="search"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                aria-label="Supplier code"
              />
            </label>
            <label>
              <span className={masterToolbarLabel}>Product group</span>
              <input
                type="search"
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value)}
                className="mt-0.5 w-full rounded border border-border bg-card px-2 py-1 text-xs"
                aria-label="Product group"
              />
            </label>
            <label>
              <span className={masterToolbarLabel}>Reference status</span>
              <select
                value={referenceStatus}
                onChange={(e) =>
                  setReferenceStatus(e.target.value as ReferenceStatusFilter)
                }
                className={`mt-0.5 w-full ${themeSelect}`}
                aria-label="Reference status"
              >
                <option value="all">All</option>
                <option value="has">Has Reference</option>
                <option value="none">No Reference</option>
              </select>
            </label>
          </div>
        </div>

        <MasterListStatus loading={loading} error={error} count={items.length} />

        <MasterTable
          columns={COLUMNS}
          stickyScroll
          isEmpty={!loading && !error && items.length === 0}
        >
          {items.map((row) => (
            <MasterTableRow
              key={row.rowId}
              cells={[
                row.productCode,
                <span key="name" title={row.productName}>
                  {row.productName}
                </span>,
                formatHookLabel(row),
                row.supplierCode,
                row.referenceProductCode,
                row.productGroup ?? "",
                row.productType,
              ]}
              actions={
                <MasterRowActions
                  editTitle={
                    row.hasReference ? "Edit planned" : "Add/Edit link planned"
                  }
                  deleteTitle={
                    row.hasReference ? "Delete planned" : "No reference to delete"
                  }
                  editAriaLabel={
                    row.hasReference
                      ? "Edit reference link planned"
                      : "Add or edit reference link planned"
                  }
                  deleteAriaLabel={
                    row.hasReference
                      ? "Delete reference link planned"
                      : "No reference to delete"
                  }
                />
              }
            />
          ))}
        </MasterTable>
      </div>
    </MasterPageShell>
  )
}
