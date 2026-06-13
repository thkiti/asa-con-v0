"use client"

import { useCallback, useEffect, useState } from "react"
import { CatalogProductCodeHover } from "@/components/catalog-image/CatalogProductCodeHover"
import { MasterPageShell } from "@/components/master/MasterPageShell"
import type { DocumentEntityCode } from "@/lib/legal-entity"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"
import {
  createMasterProductReference,
  createMasterProductWithReference,
  fetchMasterProductReference,
  patchMasterProduct,
  patchMasterProductReference,
} from "@/lib/master-ui/fetchers"
import { masterPageLayout } from "@/lib/master-ui/table-classes"
import type { ProductReferenceListItem } from "@/lib/master/types"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"
import { ProductReferenceConfirmDialog } from "./ProductReferenceConfirmDialog"
import {
  ProductReferenceFilterBar,
  refFilterToListMode,
  type ProductReferenceRefFilter,
} from "./ProductReferenceFilterBar"
import {
  ProductReferenceFormModal,
  type ProductReferenceCreateValues,
  type ProductReferenceSaveAllValues,
  type ProductReferenceSaveProductValues,
} from "./ProductReferenceFormModal"

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

function referenceIdFromRow(row: ProductReferenceListItem): string | null {
  return row.hasReference ? row.rowId : null
}

export function ProductReferencePage({
  documentEntityCode,
}: {
  documentEntityCode: DocumentEntityCode
}) {
  const [refFilter, setRefFilter] = useState<ProductReferenceRefFilter>("all")
  const mode = refFilterToListMode(refFilter)
  const [productCode, setProductCode] = useState("")
  const [productName, setProductName] = useState("")
  const [hookGroup, setHookGroup] = useState("")
  const [hookNo, setHookNo] = useState("")
  const [supplierCode, setSupplierCode] = useState("")
  const [productGroup, setProductGroup] = useState("")

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

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("edit")
  const [selectedRow, setSelectedRow] = useState<ProductReferenceListItem | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"deleteProduct" | "restore">("deleteProduct")
  const [confirmPending, setConfirmPending] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

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
        referenceStatus: "all",
      })
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load product reference")
    } finally {
      setLoading(false)
    }
  }, [mode, applied])

  useEffect(() => {
    void load()
  }, [load])

  const openEdit = (row: ProductReferenceListItem) => {
    setFormMode("edit")
    setSelectedRow(row)
    setFormError(null)
    setFormOpen(true)
  }

  const openDeleteConfirm = (row: ProductReferenceListItem) => {
    setSelectedRow(row)
    setConfirmAction("deleteProduct")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const openRestoreConfirm = (row: ProductReferenceListItem) => {
    setSelectedRow(row)
    setConfirmAction("restore")
    setConfirmError(null)
    setConfirmOpen(true)
  }

  const handleSaveProduct = async (values: ProductReferenceSaveProductValues) => {
    if (!selectedRow) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await patchMasterProduct(selectedRow.productId, {
        name: values.name,
        productType: values.productType,
      })
      setFormOpen(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleSaveAll = async (values: ProductReferenceSaveAllValues) => {
    if (!selectedRow) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await patchMasterProduct(selectedRow.productId, {
        name: values.name,
        productType: values.productType,
      })

      const refId = referenceIdFromRow(selectedRow)
      const refPayload = {
        hookGroup: values.hookGroup,
        hookNo: values.hookNo,
        supplierCode: values.supplierCode,
        productCode: selectedRow.productCode,
        productGroup: values.productGroup || null,
      }

      if (refId) {
        await patchMasterProductReference(refId, refPayload)
      } else {
        await createMasterProductReference({
          productId: selectedRow.productId,
          ...refPayload,
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

  const handleTrashReference = async () => {
    if (!selectedRow) return
    const refId = referenceIdFromRow(selectedRow)
    if (!refId) throw new Error("No reference to trash")

    setFormSubmitting(true)
    setFormError(null)
    try {
      await patchMasterProductReference(refId, { deleted: true })
      setFormOpen(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Trash reference failed")
      throw err
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedRow) return
    setConfirmPending(true)
    setConfirmError(null)
    try {
      if (confirmAction === "deleteProduct") {
        await patchMasterProduct(selectedRow.productId, { deleted: true })
      } else if (confirmAction === "restore") {
        await patchMasterProduct(selectedRow.productId, { deleted: false })
      }
      setConfirmOpen(false)
      await load()
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setConfirmPending(false)
    }
  }

  const handleCreate = async (values: ProductReferenceCreateValues) => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      await createMasterProductWithReference({
        productCode: values.productCode,
        name: values.name,
        productType: values.productType,
        hookGroup: values.hookGroup,
        hookNo: values.hookNo,
        supplierCode: values.supplierCode,
        productGroup: values.productGroup || null,
      })
      setFormOpen(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setFormSubmitting(false)
    }
  }

  const trashMode = mode === "trash"

  const openAddProduct = () => {
    setFormMode("create")
    setSelectedRow(null)
    setFormError(null)
    setFormOpen(true)
  }

  return (
    <MasterPageShell
      title="Product & Reference Stock"
      documentEntityCode={documentEntityCode}
      description="Maintain product names, types, and hook reference links. Does not change stock balances or posting rules."
      headerActions={
        <button
          type="button"
          className={themeBtnPrimary}
          onClick={openAddProduct}
          disabled={trashMode}
          title={trashMode ? "Switch to Active to add products" : undefined}
        >
          Add Product
        </button>
      }
    >
      <div className={masterPageLayout}>
        <div className="mt-3">
          <ProductReferenceFilterBar
            values={{
              productCode,
              productName,
              hookNo,
              hookGroup,
              supplierCode,
              productGroup,
              refFilter,
            }}
            onChange={(patch) => {
              if (patch.productCode !== undefined) setProductCode(patch.productCode)
              if (patch.productName !== undefined) setProductName(patch.productName)
              if (patch.hookNo !== undefined) setHookNo(patch.hookNo)
              if (patch.hookGroup !== undefined) setHookGroup(patch.hookGroup)
              if (patch.supplierCode !== undefined) setSupplierCode(patch.supplierCode)
              if (patch.productGroup !== undefined) setProductGroup(patch.productGroup)
              if (patch.refFilter !== undefined) setRefFilter(patch.refFilter)
            }}
          />
        </div>

        <MasterListStatus loading={loading} error={error} count={items.length} />

        <MasterTable columns={COLUMNS} isEmpty={!loading && !error && items.length === 0}>
          {items.map((row) => (
            <MasterTableRow
              key={row.rowId}
              cells={[
                <CatalogProductCodeHover
                  key="code"
                  productCode={row.productCode}
                  className="font-mono"
                />,
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
                  trashMode={trashMode}
                  editTitle={
                    row.hasReference ? "Edit Product Reference" : "Add Product Reference"
                  }
                  deleteTitle={trashMode ? "Restore" : "Trash product"}
                  editAriaLabel={
                    row.hasReference
                      ? `Edit ${row.productCode}`
                      : `Add product reference for ${row.productCode}`
                  }
                  deleteAriaLabel={
                    trashMode ? `Restore ${row.productCode}` : `Trash product ${row.productCode}`
                  }
                  restoreTitle="Restore product"
                  restoreAriaLabel={`Restore ${row.productCode}`}
                  editDisabled={trashMode}
                  deleteDisabled={trashMode}
                  restoreDisabled={false}
                  onEdit={trashMode ? undefined : () => openEdit(row)}
                  onDelete={!trashMode ? () => openDeleteConfirm(row) : undefined}
                  onRestore={trashMode ? () => openRestoreConfirm(row) : undefined}
                />
              }
            />
          ))}
        </MasterTable>
      </div>

      <ProductReferenceFormModal
        open={formOpen}
        mode={formMode}
        row={formMode === "edit" ? selectedRow : null}
        submitting={formSubmitting}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSaveProduct={handleSaveProduct}
        onSaveAll={handleSaveAll}
        onCreate={formMode === "create" ? handleCreate : undefined}
        onTrashReference={
          formMode === "edit" && selectedRow?.hasReference
            ? () => handleTrashReference()
            : undefined
        }
      />

      <ProductReferenceConfirmDialog
        open={confirmOpen}
        title={confirmAction === "deleteProduct" ? "Trash product" : "Restore product"}
        message={
          confirmAction === "deleteProduct"
            ? selectedRow
              ? "Trash this product? All linked ReferenceStock rows will also be moved to trash."
              : ""
            : selectedRow
              ? `Restore product ${selectedRow.productCode}? Reference links stay in trash until restored separately.`
              : ""
        }
        confirmLabel={confirmAction === "restore" ? "Restore" : "Trash product"}
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
