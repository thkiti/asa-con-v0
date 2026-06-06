import type { SessionUser } from "@/lib/auth/types"
import type { Role } from "@/lib/shared"

const VIEW_ROLES: ReadonlySet<Role> = new Set([
  "HO_ADMIN",
  "HO_FINANCE",
  "HO_OPERATIONS",
])

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
  return session
}
