"use client"

import { useEffect, useMemo } from "react"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import {
  formatDocTypeLabel,
  formatStaffFacingDocumentTitle,
  formatStaffFacingDocumentNumber,
} from "@/lib/stock-ui/format"
import {
  formatShopBranchLabel,
  type ShopBranchOption,
} from "@/lib/stock-ui/fetch-shop-branches"
import {
  applyShopSelection,
  filterShopOptionsForDocument,
  getSelectedShopIdFromLocations,
} from "@/lib/stock/document-read/stock-document-shop-selection"
import { StockDocumentStatusBadge } from "./StockDocumentStatusBadge"

type StockDocumentHeaderFormProps = {
  state: StockDocumentEditorStateVM
  onChange: (patch: Partial<StockDocumentEditorStateVM>) => void
  viewerEntityCode?: DocumentEntityCode
  /** Active SH branches (and optionally HO when included by caller). */
  shopOptions?: readonly ShopBranchOption[]
  /** HO999 option for ASAD CNT/END and for DEY/ORD auto-resolve. */
  hoBranch?: ShopBranchOption | null
}

export function StockDocumentHeaderForm({
  state,
  onChange,
  viewerEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE,
  shopOptions = [],
  hoBranch = null,
}: StockDocumentHeaderFormProps) {
  const disabled = state.readOnly
  const entityCode =
    parseDocumentEntityCode(state.legalEntityCode) ?? viewerEntityCode

  const phaseTitle = formatStaffFacingDocumentTitle(
    state.docType,
    state.status,
    entityCode
  )
  const displayRefNo = state.refNo
    ? formatStaffFacingDocumentNumber(
        state.docType,
        state.status,
        state.refNo,
        entityCode
      )
    : null

  const eligibleShops = useMemo(
    () =>
      filterShopOptionsForDocument(
        entityCode,
        state.docType,
        shopOptions,
        hoBranch
      ),
    [entityCode, state.docType, shopOptions, hoBranch]
  )

  const selectedShopId = getSelectedShopIdFromLocations(entityCode, state.docType, {
    branchId: state.branchId,
    fromLocId: state.fromLocId,
    toLocId: state.toLocId,
  })

  // Auto-select when exactly one eligible Shop and none chosen yet.
  useEffect(() => {
    if (disabled) return
    if (selectedShopId) return
    if (eligibleShops.length !== 1) return
    const only = eligibleShops[0]!
    onChange(
      applyShopSelection(only.id, {
        legalEntityCode: entityCode,
        docType: state.docType,
        hoBranchId: hoBranch?.id ?? null,
      })
    )
  }, [
    disabled,
    selectedShopId,
    eligibleShops,
    entityCode,
    state.docType,
    hoBranch?.id,
    onChange,
  ])

  function handleShopChange(shopId: string) {
    onChange(
      applyShopSelection(shopId, {
        legalEntityCode: entityCode,
        docType: state.docType,
        hoBranchId: hoBranch?.id ?? null,
      })
    )
  }

  return (
    <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Document header</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">Phase</dt>
          <dd className="text-sm font-medium text-zinc-900">{phaseTitle}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Status</dt>
          <dd className="mt-1">
            <StockDocumentStatusBadge status={state.status} />
          </dd>
        </div>
        {displayRefNo ? (
          <div>
            <dt className="text-xs text-zinc-500">Reference</dt>
            <dd className="font-mono text-sm text-zinc-900">{displayRefNo}</dd>
          </div>
        ) : null}
        <div className="sr-only">
          <dt className="text-xs text-zinc-500">Internal type</dt>
          <dd>{formatDocTypeLabel(state.docType)}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Date
          <input
            type="date"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 disabled:bg-zinc-100"
            value={state.date}
            disabled={disabled}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Shop
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 disabled:bg-zinc-100"
            value={selectedShopId}
            disabled={disabled || eligibleShops.length === 0}
            aria-label="Shop"
            data-testid="stock-document-shop"
            onChange={(e) => handleShopChange(e.target.value)}
          >
            {eligibleShops.length === 0 ? (
              <option value="">No eligible shops</option>
            ) : null}
            {eligibleShops.length > 1 && !selectedShopId ? (
              <option value="">Select shop…</option>
            ) : null}
            {eligibleShops.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {formatShopBranchLabel(branch)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
