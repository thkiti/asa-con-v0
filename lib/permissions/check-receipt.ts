import type { SessionUser } from "@/lib/auth/types"
import type { Role } from "@/lib/shared"

const VIEW_ROLES: ReadonlySet<Role> = new Set([
  "HO_ADMIN",
  "HO_FINANCE",
  "HO_OPERATIONS",
])

export function canViewCheckReceipt(role: Role | null | undefined): boolean {
  if (!role) return false
  return VIEW_ROLES.has(role)
}

export class CheckReceiptAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "CheckReceiptAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function requireCheckReceiptSession(
  session: SessionUser | null
): SessionUser {
  if (!session) {
    throw new CheckReceiptAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }
  if (!canViewCheckReceipt(session.role)) {
    throw new CheckReceiptAuthError(
      "Check receipt requires HO role",
      "FORBIDDEN",
      403
    )
  }
  return session
}
