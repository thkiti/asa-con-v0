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

/** Product name / description: case-insensitive substring contains. */
export function matchesProductName(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  return containsInsensitive(row.productName, key)
}

/** Hook group: exact match against any link (case-insensitive). */
export function matchesHookGroup(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  const upper = key.toUpperCase()
  if (row.references.length > 0) {
    return row.references.some((ref) => ref.hookGroup.toUpperCase() === upper)
  }
  return row.hookGroup.toUpperCase() === upper
}

/** Hook no: exact numeric match against any link. */
export function matchesHookNo(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  if (!/^\d+$/.test(key)) return false
  const n = Number.parseInt(key, 10)
  if (row.references.length > 0) {
    return row.references.some((ref) => ref.hookNo === n)
  }
  if (row.hookNo == null) return false
  return row.hookNo === n
}

/** Supplier code: prefix match against any link. */
export function matchesSupplierCode(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  if (row.references.length > 0) {
    return row.references.some((ref) => prefixInsensitive(ref.supplierCode, key))
  }
  return prefixInsensitive(row.supplierCode, key)
}

/** Product group: prefix match against any link. */
export function matchesProductGroup(row: ProductReferenceListItem, search: string): boolean {
  const key = search.trim()
  if (!key) return true
  if (row.references.length > 0) {
    return row.references.some(
      (ref) => ref.productGroup != null && prefixInsensitive(ref.productGroup, key)
    )
  }
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
