import type { Role } from "@/lib/shared"

const HO_STOCK_VIEWER_ROLES: ReadonlySet<Role> = new Set([
  "HO_ADMIN",
  "HO_FINANCE",
  "HO_OPERATIONS",
])

export function isHoStockDocumentViewer(role: Role): boolean {
  return HO_STOCK_VIEWER_ROLES.has(role)
}
