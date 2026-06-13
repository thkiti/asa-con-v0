import { StockDocumentUiError, StockUiErrorCodes } from "./document-errors"

export type ShopBranchOption = {
  id: string
  code: string
  name: string
}

export function formatShopBranchLabel(branch: Pick<ShopBranchOption, "code" | "name">): string {
  return `${branch.code} • ${branch.name}`
}

export async function fetchShopBranchOptions(): Promise<ShopBranchOption[]> {
  const res = await fetch("/api/shop/sales-targets/branches")
  if (!res.ok) {
    throw new StockDocumentUiError(
      "Failed to load shop branches",
      StockUiErrorCodes.REQUEST_FAILED
    )
  }
  const body = (await res.json()) as { branches?: ShopBranchOption[] }
  return body.branches ?? []
}
