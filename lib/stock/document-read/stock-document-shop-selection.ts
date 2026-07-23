/**
 * Shared Shop selection policy for Stock Documents (client-safe).
 *
 * UI exposes one “Shop” control. Entity + DocType decide which branches are
 * eligible and how the selection maps to branchId / fromLocId / toLocId.
 * Does not change schema — mapping only.
 */
import type { DocType } from "@/generated/prisma/client"
import {
  HO_BRANCH_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import type { BranchScopeOption } from "./stock-document-entity-policy"

/** Which branches appear in the Shop dropdown. */
export type StockDocumentShopOptionScope = "ho_only" | "sh_only"

/**
 * How the selected Shop maps onto stored location fields.
 * Fixed/auto fields are filled by applyShopSelection.
 */
export type StockDocumentShopMapsTo =
  /** At-location owner: branchId + fromLocId = shop; toLocId cleared. */
  | "at_branch_and_from"
  /** At-location owner only (END): branchId = shop. */
  | "at_branch"
  /** Destination shop (ASAD DEY): toLocId = shop; HO branch/from auto. */
  | "to_destination"
  /** Source shop with HO destination (ASAS ORD): branch/from = shop; to = HO. */
  | "from_with_ho_to"

export type StockDocumentShopSelectionPolicy = {
  optionScope: StockDocumentShopOptionScope
  mapsTo: StockDocumentShopMapsTo
  /** Human note for tests/docs — not shown in UI. */
  meaning: "at" | "from" | "to"
}

export type StockDocumentLocationFields = {
  branchId: string
  fromLocId: string
  toLocId: string
}

export type ApplyShopSelectionContext = {
  legalEntityCode: DocumentEntityCode
  docType: DocType
  /** Required when mapsTo needs HO (DEY source / ORD destination). */
  hoBranchId: string | null
}

/**
 * Resolve Shop dropdown policy from entity + document type.
 * TRANSFER_OUT is DEY under ASAD and ORD under ASAS.
 */
export function getStockDocumentShopSelectionPolicy(
  legalEntityCode: DocumentEntityCode,
  docType: DocType
): StockDocumentShopSelectionPolicy {
  if (legalEntityCode === "AD") {
    switch (docType) {
      case "ADJUSTMENT":
        return {
          optionScope: "ho_only",
          mapsTo: "at_branch_and_from",
          meaning: "at",
        }
      case "END":
        return {
          optionScope: "ho_only",
          mapsTo: "at_branch",
          meaning: "at",
        }
      case "TRANSFER_OUT":
        // ASAD DEY: user picks destination shop; HO is source/owner.
        return {
          optionScope: "sh_only",
          mapsTo: "to_destination",
          meaning: "to",
        }
      case "PURCHASE":
      case "TRANSFER_IN":
        return {
          optionScope: "ho_only",
          mapsTo: "at_branch_and_from",
          meaning: "at",
        }
      default:
        return {
          optionScope: "ho_only",
          mapsTo: "at_branch_and_from",
          meaning: "at",
        }
    }
  }

  // ASAS — no HO stock; Shop is always an active SH.
  switch (docType) {
    case "TRANSFER_OUT":
      // ORD: shop is source; HO is the transfer counterpart.
      return {
        optionScope: "sh_only",
        mapsTo: "from_with_ho_to",
        meaning: "from",
      }
    case "END":
      return {
        optionScope: "sh_only",
        mapsTo: "at_branch",
        meaning: "at",
      }
    case "ADJUSTMENT":
    case "PERFORMANCE":
    default:
      return {
        optionScope: "sh_only",
        mapsTo: "at_branch_and_from",
        meaning: "at",
      }
  }
}

export function filterShopOptionsForDocument(
  legalEntityCode: DocumentEntityCode,
  docType: DocType,
  shopBranches: readonly BranchScopeOption[],
  hoBranch?: BranchScopeOption | null
): BranchScopeOption[] {
  const { optionScope } = getStockDocumentShopSelectionPolicy(
    legalEntityCode,
    docType
  )

  if (optionScope === "ho_only") {
    if (hoBranch) return [hoBranch]
    const found = shopBranches.find(
      (b) =>
        b.code.trim().toUpperCase() === HO_BRANCH_CODE || b.type === "HO"
    )
    return found ? [found] : []
  }

  return shopBranches.filter(
    (b) =>
      b.type === "SH" ||
      (b.type == null && b.code.trim().toUpperCase() !== HO_BRANCH_CODE)
  )
}

/**
 * Which branch id should appear as the selected Shop for an existing document.
 */
export function getSelectedShopIdFromLocations(
  legalEntityCode: DocumentEntityCode,
  docType: DocType,
  locations: Pick<StockDocumentLocationFields, "branchId" | "fromLocId" | "toLocId">
): string {
  const { mapsTo } = getStockDocumentShopSelectionPolicy(
    legalEntityCode,
    docType
  )
  const branchId = String(locations.branchId ?? "").trim()
  const fromLocId = String(locations.fromLocId ?? "").trim()
  const toLocId = String(locations.toLocId ?? "").trim()

  switch (mapsTo) {
    case "to_destination":
      return toLocId
    case "from_with_ho_to":
      return fromLocId || branchId
    case "at_branch":
      return branchId
    case "at_branch_and_from":
    default:
      return branchId || fromLocId
  }
}

/**
 * Map a Shop selection onto stored location fields for save/create.
 * Preserves schema: still writes branchId / fromLocId / toLocId as required.
 */
export function applyShopSelection(
  shopId: string,
  ctx: ApplyShopSelectionContext
): StockDocumentLocationFields {
  const selected = String(shopId ?? "").trim()
  const hoId = String(ctx.hoBranchId ?? "").trim()
  const { mapsTo } = getStockDocumentShopSelectionPolicy(
    ctx.legalEntityCode,
    ctx.docType
  )

  switch (mapsTo) {
    case "to_destination": {
      // ASAD DEY: HO owns/ships; Shop is destination (may be empty until chosen).
      if (!hoId) {
        return {
          branchId: selected,
          fromLocId: selected,
          toLocId: selected,
        }
      }
      return {
        branchId: hoId,
        fromLocId: hoId,
        toLocId: selected,
      }
    }
    case "from_with_ho_to": {
      // ASAS ORD: shop ships; HO is counterpart when known.
      return {
        branchId: selected,
        fromLocId: selected,
        toLocId: hoId,
      }
    }
    case "at_branch":
      return {
        branchId: selected,
        fromLocId: "",
        toLocId: "",
      }
    case "at_branch_and_from":
    default:
      return {
        branchId: selected,
        fromLocId: selected,
        toLocId: "",
      }
  }
}

/** Whether Shop selection requires a known HO branch id to complete the document. */
export function shopSelectionRequiresHoBranch(
  legalEntityCode: DocumentEntityCode,
  docType: DocType
): boolean {
  const { mapsTo } = getStockDocumentShopSelectionPolicy(
    legalEntityCode,
    docType
  )
  return mapsTo === "to_destination" || mapsTo === "from_with_ho_to"
}
