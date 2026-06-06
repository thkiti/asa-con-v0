import type { SessionUser } from "@/lib/auth/types"
import type { Role } from "@/lib/shared"

const VIEW_ROLES: ReadonlySet<Role> = new Set([
  "HO_ADMIN",
  "HO_FINANCE",
  "HO_OPERATIONS",
])

const EDIT_ROLES: ReadonlySet<Role> = new Set(["HO_ADMIN", "HO_FINANCE"])

export function canViewSalesTargets(role: Role | null | undefined): boolean {
  if (!role) return false
  return VIEW_ROLES.has(role)
}

export function canEditSalesTargets(role: Role | null | undefined): boolean {
  if (!role) return false
  return EDIT_ROLES.has(role)
}

export class SalesTargetAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "SalesTargetAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function requireSalesTargetViewSession(
  session: SessionUser | null
): SessionUser {
  if (!session) {
    throw new SalesTargetAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }
  if (!canViewSalesTargets(session.role)) {
    throw new SalesTargetAuthError(
      "Sales target access requires HO role",
      "FORBIDDEN",
      403
    )
  }
  return session
}

export function requireSalesTargetEditSession(
  session: SessionUser | null
): SessionUser {
  const user = requireSalesTargetViewSession(session)
  if (!canEditSalesTargets(user.role)) {
    throw new SalesTargetAuthError(
      "Sales target edit requires HO_ADMIN or HO_FINANCE",
      "FORBIDDEN",
      403
    )
  }
  return user
}
