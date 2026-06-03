import type {
  ProductReferenceListItem,
  ProductReferenceListQuery,
} from "../types"

function containsInsensitive(haystack: string, needle: string): boolean {
  if (!needle) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function applyProductReferenceFilters(
  rows: ProductReferenceListItem[],
  query: ProductReferenceListQuery
): ProductReferenceListItem[] {
  let result = rows

  if (query.productCode) {
    result = result.filter((row) =>
      containsInsensitive(row.productCode, query.productCode)
    )
  }

  if (query.productName) {
    result = result.filter((row) =>
      containsInsensitive(row.productName, query.productName)
    )
  }

  if (query.hookGroup) {
    result = result.filter((row) =>
      containsInsensitive(row.hookGroup, query.hookGroup)
    )
  }

  if (query.hookNo) {
    const hookNoText = query.hookNo.trim()
    result = result.filter((row) => {
      if (row.hookNo == null) return false
      return String(row.hookNo).includes(hookNoText)
    })
  }

  if (query.supplierCode) {
    result = result.filter((row) =>
      containsInsensitive(row.supplierCode, query.supplierCode)
    )
  }

  if (query.productGroup) {
    result = result.filter((row) =>
      row.productGroup != null &&
      containsInsensitive(row.productGroup, query.productGroup)
    )
  }

  if (query.referenceStatus === "has") {
    result = result.filter((row) => row.hasReference)
  } else if (query.referenceStatus === "none") {
    result = result.filter((row) => !row.hasReference)
  }

  return result
}
