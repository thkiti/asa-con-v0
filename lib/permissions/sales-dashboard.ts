import type { SessionUser } from "@/lib/auth/types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import type { Role } from "@/lib/shared"

const VIEW_ROLES: ReadonlySet<Role> = new Set([
  "HO_ADMIN",
  "HO_FINANCE",
  "HO_OPERATIONS",
])

export const SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE =
  "This report is available for ASAS shop sales only."

/** Shop POS sales dashboard is ASAS-only; ASAD has no shop/POS sales. */
export function canAccessShopSalesDashboard(
  documentEntityCode: DocumentEntityCode | null | undefined
): boolean {
  return (documentEntityCode ?? DEFAULT_DOCUMENT_ENTITY_CODE) === "AS"
}

export function canViewSalesDashboard(role: Role | null | undefined): boolean {
  if (!role) return false
  return VIEW_ROLES.has(role)
}

export class SalesDashboardAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "SalesDashboardAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function requireSalesDashboardSession(
  session: SessionUser | null
): SessionUser {
  if (!session) {
    throw new SalesDashboardAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }
  if (!canViewSalesDashboard(session.role)) {
    throw new SalesDashboardAuthError(
      "Sales dashboard requires HO role",
      "FORBIDDEN",
      403
    )
  }
  if (!canAccessShopSalesDashboard(session.documentEntityCode)) {
    throw new SalesDashboardAuthError(
      SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE,
      "SHOP_SALES_ENTITY_FORBIDDEN",
      403
    )
  }
  return session
}
