import type { SessionUser } from "@/lib/auth/types"
import type { Role } from "@/lib/shared"

/** Master Database maintenance — HO_ADMIN only (same bar as System Import). */
export function canAccessMasterDatabase(
  role: Role | null | undefined
): boolean {
  return role === "HO_ADMIN"
}

export class MasterDatabaseAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "MasterDatabaseAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function requireMasterDatabaseSession(
  session: SessionUser | null
): SessionUser {
  if (!session) {
    throw new MasterDatabaseAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }

  if (!canAccessMasterDatabase(session.role)) {
    throw new MasterDatabaseAuthError(
      "Master Database requires HO_ADMIN",
      "FORBIDDEN",
      403
    )
  }

  return session
}
