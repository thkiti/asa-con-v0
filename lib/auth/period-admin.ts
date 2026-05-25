import type { ClosePolicyRole } from "@/lib/finance/close-policy"
import type { Role } from "@/lib/shared"
import type { SessionUser } from "./types"

export class PeriodAdminAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "PeriodAdminAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function mapRoleToClosePolicyRole(role: Role): ClosePolicyRole | null {
  if (role === "HO_FINANCE") return "HO_FINANCE"
  if (role === "HO_ADMIN") return "HO_ADMIN"
  return null
}

export function requirePeriodAdminActor(
  session: SessionUser | null
): { staffId: string; role: ClosePolicyRole } {
  if (!session) {
    throw new PeriodAdminAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }

  const staffId = session.staffId.trim()
  if (!staffId) {
    throw new PeriodAdminAuthError(
      "Staff ID missing from session",
      "MISSING_STAFF_ID",
      401
    )
  }

  const role = mapRoleToClosePolicyRole(session.role)
  if (!role) {
    throw new PeriodAdminAuthError(
      "Insufficient permissions for period admin",
      "FORBIDDEN",
      403
    )
  }

  return { staffId, role }
}
