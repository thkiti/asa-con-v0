import { DEFAULT_LIST_PAGE_SIZE } from "./constants"
import { fetchStockDocumentList } from "./fetchers"
import type { StockDocumentListFilter, StockDocumentListResultVM } from "./types"

/** List load helper used by the shop list controller (testable without React). */
export async function loadStockDocumentListPage(
  filter: StockDocumentListFilter,
  cursor?: string | null
): Promise<StockDocumentListResultVM> {
  return fetchStockDocumentList({
    ...filter,
    cursor: cursor ?? undefined,
    limit: filter.limit ?? DEFAULT_LIST_PAGE_SIZE,
  })
}
