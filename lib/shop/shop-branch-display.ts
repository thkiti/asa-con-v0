import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"

/** Dev/smoke branches — shown last and never auto-selected. */
export function isNonProductionShopBranchCode(code: string): boolean {
  const normalized = code.trim().toUpperCase()
  return (
    normalized.startsWith("P1C") ||
    normalized.startsWith("SMOKE") ||
    normalized.startsWith("TEST") ||
    normalized.startsWith("DEMO")
  )
}

export function orderShopBranchesForDisplay<T extends { code: string }>(
  branches: readonly T[]
): T[] {
  return [...branches].sort((left, right) => {
    const leftNonProd = isNonProductionShopBranchCode(left.code)
    const rightNonProd = isNonProductionShopBranchCode(right.code)
    if (leftNonProd !== rightNonProd) {
      return leftNonProd ? 1 : -1
    }
    return left.code.localeCompare(right.code, undefined, {
      sensitivity: "base",
    })
  })
}

export function pickDefaultShopBranchId(
  branches: readonly SalesTargetBranchOption[],
  preferredBranchId?: string | null
): string {
  const ordered = orderShopBranchesForDisplay(branches)
  if (!ordered.length) return ""

  const preferred = preferredBranchId?.trim()
  if (preferred) {
    const hit = ordered.find((branch) => branch.id === preferred)
    if (hit && !isNonProductionShopBranchCode(hit.code)) {
      return hit.id
    }
  }

  const firstReal = ordered.find(
    (branch) => !isNonProductionShopBranchCode(branch.code)
  )
  return firstReal?.id ?? ordered[0]?.id ?? ""
}
