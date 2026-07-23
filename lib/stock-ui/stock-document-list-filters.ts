import type { DocStatus } from "@/lib/stock-ui/types"
import type { StockDocumentKindFilter } from "@/lib/stock/document-read/stock-document-entity-policy"
import {
  defaultPeriodSelectorParts,
  resolvePeriodSelectorParts,
} from "@/lib/ui/period-selector"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type StockDocumentListFilterState = {
  shopBranchId: string
  docKind: StockDocumentKindFilter
  status: "" | DocStatus
  periodMonth: string
}

/** Default list filters — period always a valid YYYY-MM (Bangkok current). */
export function defaultStockDocumentListFilters(
  now: Date = new Date()
): StockDocumentListFilterState {
  return {
    shopBranchId: "",
    docKind: "",
    status: "",
    periodMonth: defaultPeriodSelectorParts(now).periodKey,
  }
}

/**
 * Clear restores entity-safe branch/type/status defaults and the standard
 * current Year/Month period. Preserves nothing from the previous filter set.
 */
export function clearStockDocumentListFilters(input: {
  entityCode: DocumentEntityCode
  hoBranchId: string | null
  sessionShopBranchId: string | null
  isHoViewer: boolean
  now?: Date
}): StockDocumentListFilterState {
  const base = defaultStockDocumentListFilters(input.now)
  if (input.entityCode === "AD" && input.hoBranchId) {
    return { ...base, shopBranchId: input.hoBranchId }
  }
  if (!input.isHoViewer && input.sessionShopBranchId) {
    return { ...base, shopBranchId: input.sessionShopBranchId }
  }
  return base
}

/** Ensure periodMonth is always a valid periodKey for queries / END create. */
export function resolveStockDocumentPeriodKey(
  periodMonth: string,
  now: Date = new Date()
): string {
  return resolvePeriodSelectorParts(periodMonth, now).periodKey
}
