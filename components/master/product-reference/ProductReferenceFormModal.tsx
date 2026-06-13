"use client"

import { useCallback, useEffect, useState } from "react"
import {
  buildProductGroup,
  cleanGroupDisplayName,
  DEFAULT_PRODUCT_GROUP_RUN,
  extractRunFromProductGroup,
} from "@/lib/master/build-product-group"
import {
  fetchMasterLatestHookNo,
  fetchMasterProductByCode,
} from "@/lib/master-ui/fetchers"
import { COUNTING_HOOK_GROUPS } from "@/lib/stock-ui/counting-hook-groups"
import type { ProductReferenceListItem } from "@/lib/master/types"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeInput,
  themeSelect,
} from "@/lib/theme/theme-classes"
import { ProductReferenceConfirmDialog } from "./ProductReferenceConfirmDialog"
import { ProductReferenceSaveChoiceDialog } from "./ProductReferenceSaveChoiceDialog"

const PRODUCT_TYPE_OPTIONS: { value: ProductReferenceListItem["productType"]; label: string }[] = [
  { value: "TRACKED", label: "TRACKED" },
  { value: "CONSUMABLE", label: "CONSUMABLE" },
]

export const PRODUCT_TYPE_CHANGE_WARNING =
  "Changing Product Type affects future operational behavior. Historical stock and finance records are not modified."

export type ProductReferenceSaveProductValues = {
  name: string
  productType: ProductReferenceListItem["productType"]
}

export type ProductReferenceSaveAllValues = ProductReferenceSaveProductValues & {
  hookGroup: string
  hookNo: number
  supplierCode: string
  productGroup: string
}

export type ProductReferenceCreateValues = ProductReferenceSaveAllValues & {
  productCode: string
}

type ProductReferenceFormModalProps = {
  open: boolean
  mode?: "create" | "edit"
  row?: ProductReferenceListItem | null
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSaveProduct: (values: ProductReferenceSaveProductValues) => Promise<void>
  onSaveAll: (values: ProductReferenceSaveAllValues) => Promise<void>
  onCreate?: (values: ProductReferenceCreateValues) => Promise<void>
  onTrashReference?: () => Promise<void>
}

function sanitizeHookGroupInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^KCMOS]/g, "")
    .slice(0, 1)
}

export function ProductReferenceFormModal({
  open,
  mode = "edit",
  row,
  submitting = false,
  error,
  onClose,
  onSaveProduct,
  onSaveAll,
  onCreate,
  onTrashReference,
}: ProductReferenceFormModalProps) {
  const isCreateMode = mode === "create"
  const [productCodeInput, setProductCodeInput] = useState("")
  const [name, setName] = useState("")
  const [productType, setProductType] = useState<ProductReferenceListItem["productType"]>("TRACKED")
  const [initialProductType, setInitialProductType] =
    useState<ProductReferenceListItem["productType"]>("TRACKED")
  const [hookGroup, setHookGroup] = useState("")
  const [hookNo, setHookNo] = useState("")
  const [supplierCode, setSupplierCode] = useState("")
  const [run, setRun] = useState(DEFAULT_PRODUCT_GROUP_RUN)
  const [derivedProductGroup, setDerivedProductGroup] = useState("")
  const [groupName, setGroupName] = useState("")
  const [groupLookupMissing, setGroupLookupMissing] = useState(false)
  const [showSaveChoice, setShowSaveChoice] = useState(false)
  const [trashRefConfirmOpen, setTrashRefConfirmOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const hasReference = row?.hasReference ?? false
  const sellableProductCode = isCreateMode ? productCodeInput : (row?.productCode ?? "")

  const resetFormEmpty = useCallback(() => {
    setProductCodeInput("")
    setName("")
    setProductType("TRACKED")
    setInitialProductType("TRACKED")
    setHookGroup("")
    setHookNo("")
    setSupplierCode("")
    setRun(DEFAULT_PRODUCT_GROUP_RUN)
    setLocalError(null)
  }, [])

  const resetFormFromRow = useCallback(() => {
    if (!row) return
    setProductCodeInput(row.productCode)
    setName(row.productName)
    setProductType(row.productType)
    setInitialProductType(row.productType)
    setHookGroup(row.hookGroup)
    setHookNo(row.hookNo != null ? String(row.hookNo) : "")
    setSupplierCode(
      row.hookGroup === "S" ? "-" : row.supplierCode || ""
    )
    setRun(extractRunFromProductGroup(row.productGroup))
    setLocalError(null)
  }, [row])

  useEffect(() => {
    if (!open) {
      setShowSaveChoice(false)
      setTrashRefConfirmOpen(false)
      return
    }
    if (isCreateMode) {
      resetFormEmpty()
    } else {
      resetFormFromRow()
    }
  }, [open, isCreateMode, resetFormEmpty, resetFormFromRow])

  useEffect(() => {
    if (!open || !sellableProductCode) return
    const code = buildProductGroup(sellableProductCode, run)
    setDerivedProductGroup(code)
  }, [open, sellableProductCode, run])

  useEffect(() => {
    if (!open || !derivedProductGroup) {
      setGroupName("")
      setGroupLookupMissing(false)
      return
    }

    let cancelled = false
    void fetchMasterProductByCode(derivedProductGroup).then((product) => {
      if (cancelled) return
      if (!product) {
        setGroupName("")
        setGroupLookupMissing(true)
        return
      }
      setGroupName(cleanGroupDisplayName(product.name))
      setGroupLookupMissing(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, derivedProductGroup])

  const handleHookGroupChange = async (value: string) => {
    const clean = sanitizeHookGroupInput(value)
    setHookGroup(clean)

    if (!clean) {
      setHookNo("")
      setSupplierCode("")
      return
    }

    if (!hasReference || isCreateMode) {
      try {
        const { nextHookNo } = await fetchMasterLatestHookNo(clean)
        setHookNo(String(nextHookNo))
      } catch {
        setHookNo("1")
      }
    }

    if (clean === "S") {
      setSupplierCode("-")
      setRun(DEFAULT_PRODUCT_GROUP_RUN)
    } else if (supplierCode === "-") {
      setSupplierCode("")
    }
  }

  if (!open) return null
  if (!isCreateMode && !row) return null

  const trimmedName = name.trim()
  const trimmedProductCode = productCodeInput.replace(/\D/g, "").slice(0, 7)
  const hookNoNum = Number(hookNo)
  const showTypeWarning = productType !== initialProductType
  const displayError = localError ?? error

  const canSaveProduct = trimmedName.length > 0 && !submitting

  const validateSaveAll = (): string | null => {
    if (isCreateMode) {
      if (!trimmedProductCode) return "Product code is required"
      if (trimmedProductCode.length < 1) return "Product code must be a valid 7-digit product code"
    }
    if (!trimmedName) return "Product name is required"
    if (!hookGroup.trim()) return "Hook group is required"
    if (!Number.isInteger(hookNoNum) || hookNoNum <= 0) return "Hook number must be a positive integer"
    const groupUpper = hookGroup.trim().toUpperCase()
    if (groupUpper !== "S" && !supplierCode.trim()) return "Supplier code is required"
    if (!derivedProductGroup) return "Product group could not be derived from product code and run"
    return null
  }

  const runSaveProduct = async () => {
    if (!canSaveProduct) return
    setShowSaveChoice(false)
    setLocalError(null)
    await onSaveProduct({ name: trimmedName, productType })
  }

  const runSaveAll = async () => {
    const validationError = validateSaveAll()
    if (validationError) {
      setLocalError(validationError)
      setShowSaveChoice(false)
      return
    }
    setShowSaveChoice(false)
    setLocalError(null)
    const groupUpper = hookGroup.trim().toUpperCase()
    const values: ProductReferenceSaveAllValues = {
      name: trimmedName,
      productType,
      hookGroup: groupUpper,
      hookNo: hookNoNum,
      supplierCode: groupUpper === "S" ? "-" : supplierCode.trim().toUpperCase(),
      productGroup: derivedProductGroup,
    }
    await onSaveAll(values)
  }

  const runCreate = async () => {
    const validationError = validateSaveAll()
    if (validationError) {
      setLocalError(validationError)
      return
    }
    if (!onCreate) return
    setLocalError(null)
    const groupUpper = hookGroup.trim().toUpperCase()
    await onCreate({
      name: trimmedName,
      productType,
      productCode: trimmedProductCode,
      hookGroup: groupUpper,
      hookNo: hookNoNum,
      supplierCode: groupUpper === "S" ? "-" : supplierCode.trim().toUpperCase(),
      productGroup: derivedProductGroup,
    })
  }

  const title = isCreateMode
    ? "Add Product Reference"
    : hasReference
      ? "Edit Product Reference"
      : "Add Product Reference"

  return (
    <>
      <ProductReferenceSaveChoiceDialog
        open={showSaveChoice && !isCreateMode}
        pending={submitting}
        onSaveProduct={() => void runSaveProduct()}
        onSaveAll={() => void runSaveAll()}
        onCancel={() => setShowSaveChoice(false)}
      />

      <ProductReferenceConfirmDialog
        open={trashRefConfirmOpen}
        title="Trash reference link"
        message={`Move reference ${formatHookLabel(hookGroup, hookNo)} for ${sellableProductCode} to trash? Product stays active.`}
        confirmLabel="Trash reference"
        pending={submitting}
        error={displayError}
        onClose={() => {
          if (!submitting) setTrashRefConfirmOpen(false)
        }}
        onConfirm={() => {
          if (!onTrashReference) return
          void onTrashReference()
            .then(() => setTrashRefConfirmOpen(false))
            .catch(() => {
              /* error shown via error prop */
            })
        }}
      />

      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-ref-form-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id="product-ref-form-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={themeBtnSecondary}
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <section className="space-y-3 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">Reference Stock</h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Group</span>
                  <select
                    value={hookGroup}
                    onChange={(event) => void handleHookGroupChange(event.target.value)}
                    disabled={submitting}
                    className={`mt-0.5 w-full ${themeSelect}`}
                  >
                    <option value="">Hook</option>
                    {COUNTING_HOOK_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">No</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={hookNo}
                    onChange={(event) =>
                      setHookNo(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    disabled={submitting}
                    className={`mt-0.5 w-full ${themeInput}`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">Run</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={run}
                    onChange={(event) =>
                      setRun(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    disabled={submitting}
                    placeholder="900"
                    className={`mt-0.5 w-full ${themeInput}`}
                  />
                </label>

                <label className="block sm:col-span-1">
                  <span className="text-xs text-muted-foreground">Supplier Code</span>
                  <input
                    type="text"
                    value={hookGroup === "S" ? "-" : supplierCode}
                    onChange={(event) => {
                      if (hookGroup === "S") return
                      setSupplierCode(event.target.value.toUpperCase())
                    }}
                    disabled={submitting || hookGroup === "S"}
                    className={`mt-0.5 w-full ${themeInput}`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Product Group</span>
                  <input
                    type="text"
                    readOnly
                    value={derivedProductGroup}
                    className={`mt-0.5 w-full ${themeInput} bg-[var(--btn-secondary-hover)]`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">Group Name</span>
                  <input
                    type="text"
                    readOnly
                    value={groupName}
                    placeholder={groupLookupMissing ? "Group product not found" : ""}
                    className={`mt-0.5 w-full ${themeInput} bg-[var(--btn-secondary-hover)]`}
                  />
                </label>
              </div>

              {groupLookupMissing ? (
                <p className="text-xs text-amber-700" role="status">
                  Group product {derivedProductGroup} was not found in import data. You can still
                  save; verify the group code and run (900 = normal, 901/902 = variants).
                </p>
              ) : null}
            </section>

            <section className="space-y-3 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">Product</h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Product Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    readOnly={!isCreateMode}
                    value={isCreateMode ? productCodeInput : sellableProductCode}
                    onChange={(event) =>
                      setProductCodeInput(event.target.value.replace(/\D/g, "").slice(0, 7))
                    }
                    disabled={submitting}
                    className={`mt-0.5 w-full ${themeInput} ${isCreateMode ? "font-medium" : "bg-[var(--btn-secondary-hover)] font-medium"}`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">Product Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={submitting}
                    className={`mt-0.5 w-full ${themeInput}`}
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-muted-foreground">Product Type</span>
                <select
                  value={productType}
                  onChange={(event) =>
                    setProductType(event.target.value as ProductReferenceListItem["productType"])
                  }
                  disabled={submitting}
                  className={`mt-0.5 w-full ${themeSelect}`}
                >
                  {PRODUCT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {showTypeWarning ? (
                  <p className="mt-1 text-xs text-amber-700" role="status">
                    {PRODUCT_TYPE_CHANGE_WARNING}
                  </p>
                ) : null}
              </label>
            </section>

            {displayError ? (
              <p className="text-sm text-red-600" role="alert">
                {displayError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              {!isCreateMode && hasReference && onTrashReference ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setTrashRefConfirmOpen(true)}
                  className="text-sm text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Trash Reference Link
                </button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className={themeBtnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCreateMode ? submitting || !onCreate : !canSaveProduct}
                  onClick={() => {
                    setLocalError(null)
                    if (isCreateMode) {
                      void runCreate()
                    } else {
                      setShowSaveChoice(true)
                    }
                  }}
                  className={themeBtnPrimary}
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function formatHookLabel(group: string, no: string): string {
  if (!group) return ""
  if (!no) return group
  return `${group}.${no}`
}
