import type { SessionUser } from "./types"

export class SystemImportAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "SystemImportAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function requireSystemImportActor(
  session: SessionUser | null
): { staffId: string; role: "HO_ADMIN" } {
  if (!session) {
    throw new SystemImportAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }

  const staffId = session.staffId.trim()
  if (!staffId) {
    throw new SystemImportAuthError(
      "Staff ID missing from session",
      "MISSING_STAFF_ID",
      401
    )
  }

  if (session.role !== "HO_ADMIN") {
    throw new SystemImportAuthError(
      "System import requires HO_ADMIN",
      "FORBIDDEN",
      403
    )
  }

  return { staffId, role: "HO_ADMIN" }
}
