"use client"

import { useEffect, useState } from "react"
import type { ProductReferenceListItem } from "@/lib/master/types"
import { themeBtnPrimary, themeBtnSecondary, themeInput, themeMuted } from "@/lib/theme/theme-classes"

const PRODUCT_TYPE_OPTIONS: { value: ProductReferenceListItem["productType"]; label: string }[] = [
  { value: "TRACKED", label: "TRACKED" },
  { value: "CONSUMABLE", label: "CONSUMABLE" },
]

export const PRODUCT_TYPE_CHANGE_WARNING =
  "Changing Product Type affects future operational behavior. Historical stock and finance records are not modified."

export type ProductReferenceFormMode = "create" | "edit"

type ProductReferenceFormModalProps = {
  open: boolean
  mode: ProductReferenceFormMode
  row?: ProductReferenceListItem | null
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: {
    name: string
    productType: ProductReferenceListItem["productType"]
    hookGroup: string
    hookNo: string
    supplierCode: string
    productCode: string
    productGroup: string
  }) => Promise<void>
}

export function ProductReferenceFormModal({
  open,
  mode,
  row,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: ProductReferenceFormModalProps) {
  const [name, setName] = useState("")
  const [productType, setProductType] = useState<ProductReferenceListItem["productType"]>("TRACKED")
  const [hookGroup, setHookGroup] = useState("")
  const [hookNo, setHookNo] = useState("")
  const [supplierCode, setSupplierCode] = useState("")
  const [productCode, setProductCode] = useState("")
  const [productGroup, setProductGroup] = useState("")
  const [initialProductType, setInitialProductType] =
    useState<ProductReferenceListItem["productType"]>("TRACKED")

  const hasReference = row?.hasReference ?? false
  const isCreateLink = mode === "create" || (mode === "edit" && !hasReference)

  useEffect(() => {
    if (!open || !row) return
    setName(row.productName)
    setProductType(row.productType)
    setInitialProductType(row.productType)
    setHookGroup(row.hookGroup)
    setHookNo(row.hookNo != null ? String(row.hookNo) : "")
    setSupplierCode(row.supplierCode)
    setProductCode(row.referenceProductCode || row.productCode)
    setProductGroup(row.productGroup ?? "")
  }, [open, row])

  if (!open || !row) return null

  const trimmedName = name.trim()
  const hookNoNum = Number(hookNo)
  const showTypeWarning = productType !== initialProductType
  const canSubmit =
    trimmedName.length > 0 &&
    (!isCreateLink ||
      (hookGroup.trim().length > 0 &&
        Number.isInteger(hookNoNum) &&
        hookNoNum > 0 &&
        supplierCode.trim().length > 0 &&
        productCode.trim().length > 0)) &&
    !submitting

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-ref-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="product-ref-form-title" className="text-lg font-semibold">
          {isCreateLink ? "Add reference link" : "Edit product & reference"}
        </h2>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit) return
            void onSubmit({
              name: trimmedName,
              productType,
              hookGroup: hookGroup.trim().toUpperCase(),
              hookNo: hookNo.trim(),
              supplierCode: supplierCode.trim(),
              productCode: productCode.trim(),
              productGroup: productGroup.trim(),
            })
          }}
        >
          <div className="rounded border border-border bg-[var(--btn-secondary-hover)] p-3 text-sm">
            <div>
              <span className={themeMuted}>Product code: </span>
              <span className="font-medium">{row.productCode}</span>
            </div>
          </div>

          <label className="block">
            <span className="text-sm text-muted-foreground">Product name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              className={themeInput}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted-foreground">Product type</span>
            <select
              value={productType}
              onChange={(event) =>
                setProductType(event.target.value as ProductReferenceListItem["productType"])
              }
              disabled={submitting}
              className={themeInput}
            >
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showTypeWarning ? (
              <p className={`mt-1 text-xs text-amber-700`} role="status">
                {PRODUCT_TYPE_CHANGE_WARNING}
              </p>
            ) : null}
          </label>

          {isCreateLink || hasReference ? (
            <fieldset className="space-y-3 border-t border-border pt-3">
              <legend className="text-sm font-medium">Reference link</legend>
              <label className="block">
                <span className="text-sm text-muted-foreground">Hook group</span>
                <input
                  type="text"
                  maxLength={1}
                  value={hookGroup}
                  onChange={(event) => setHookGroup(event.target.value)}
                  disabled={submitting}
                  className={themeInput}
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted-foreground">Hook no</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hookNo}
                  onChange={(event) => setHookNo(event.target.value)}
                  disabled={submitting}
                  className={themeInput}
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted-foreground">Supplier code</span>
                <input
                  type="text"
                  value={supplierCode}
                  onChange={(event) => setSupplierCode(event.target.value)}
                  disabled={submitting}
                  className={themeInput}
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted-foreground">Reference product code</span>
                <input
                  type="text"
                  value={productCode}
                  onChange={(event) => setProductCode(event.target.value)}
                  disabled={submitting}
                  className={themeInput}
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted-foreground">Product group</span>
                <input
                  type="text"
                  value={productGroup}
                  onChange={(event) => setProductGroup(event.target.value)}
                  disabled={submitting}
                  className={themeInput}
                />
              </label>
            </fieldset>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className={themeBtnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} className={themeBtnPrimary}>
              {submitting ? "Saving…" : isCreateLink ? "Create link" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
