import type {
  ProductReferenceListItem,
  ProductReferenceListQuery,
} from "../types"

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "")
}

function containsInsensitive(haystack: string, needle: string): boolean {
  if (!needle) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function prefixInsensitive(haystack: string, needle: string): boolean {
  if (!needle) return true
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  return h.startsWith(n)
}

/** Product code: prefix from first character (digit-normalized). */
export function matchesProductCode(row: ProductReferenceListItem, search: string): boolean {
  const key = normalizeDigits(search)
  if (!key) return true
  const code = normalizeDigits(row.productCode)
  return code.startsWith(key)
}

/** Product name: substring search. */
export function matchesProductName(row: ProductReferenceListItem, search: string): boolean {
  if (!search) return true
  return containsInsensitive(row.productName, search)
}

/** Hook group: exact match (case-insensitive). */
export function matchesHookGroup(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  return row.hookGroup.toUpperCase() === key.toUpperCase()
}

/** Hook no: exact numeric match. */
export function matchesHookNo(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  if (!/^\d+$/.test(key)) return false
  if (row.hookNo == null) return false
  return row.hookNo === Number.parseInt(key, 10)
}

/** Supplier code: prefix match. */
export function matchesSupplierCode(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  return prefixInsensitive(row.supplierCode, key)
}

/** Product group: prefix match. */
export function matchesProductGroup(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  if (row.productGroup == null) return false
  return prefixInsensitive(row.productGroup, key)
}

export function applyProductReferenceFilters(
  rows: ProductReferenceListItem[],
  query: ProductReferenceListQuery
): ProductReferenceListItem[] {
  let result = rows

  if (query.productCode) {
    result = result.filter((row) => matchesProductCode(row, query.productCode))
  }

  if (query.productName) {
    result = result.filter((row) => matchesProductName(row, query.productName))
  }

  if (query.hookGroup) {
    result = result.filter((row) => matchesHookGroup(row, query.hookGroup))
  }

  if (query.hookNo) {
    result = result.filter((row) => matchesHookNo(row, query.hookNo))
  }

  if (query.supplierCode) {
    result = result.filter((row) => matchesSupplierCode(row, query.supplierCode))
  }

  if (query.productGroup) {
    result = result.filter((row) => matchesProductGroup(row, query.productGroup))
  }

  if (query.referenceStatus === "has") {
    result = result.filter((row) => row.hasReference)
  } else if (query.referenceStatus === "none") {
    result = result.filter((row) => !row.hasReference)
  }

  return result
}

function hookNoSortKey(hookNo: number | null | undefined): number {
  if (hookNo == null || !Number.isFinite(hookNo)) {
    return Number.POSITIVE_INFINITY
  }
  return Math.trunc(hookNo)
}

function isHookFilterSelected(query: ProductReferenceListQuery): boolean {
  return Boolean(query.hookGroup.trim() || query.hookNo.trim())
}

/**
 * When a Hook filter is selected, order by Hook ascending (group, then numeric hookNo).
 * Otherwise keep the incoming order (Product Code ascending from the list query).
 * No secondary Product Code tie-break — one Hook maps to one Product.
 */
export function orderProductReferenceList(
  rows: ProductReferenceListItem[],
  query: ProductReferenceListQuery
): ProductReferenceListItem[] {
  if (!isHookFilterSelected(query)) return rows

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const groupCmp = a.row.hookGroup.localeCompare(b.row.hookGroup)
      if (groupCmp !== 0) return groupCmp
      const keyA = hookNoSortKey(a.row.hookNo)
      const keyB = hookNoSortKey(b.row.hookNo)
      if (keyA !== keyB) return keyA - keyB
      return a.index - b.index
    })
    .map(({ row }) => row)
}
