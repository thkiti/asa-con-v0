import { cookies } from "next/headers"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  parseDocumentEntityCode,
} from "@/lib/legal-entity"
import type { Role } from "@/lib/shared"
import { readSessionCookies, isSessionValid } from "./cookies"
import type { SessionUser } from "./types"

const VALID_ROLES: ReadonlySet<string> = new Set([
  "HO_FINANCE",
  "HO_ADMIN",
  "HO_OPERATIONS",
  "SH_STAFF",
])

function parseRole(value: string | undefined): Role | null {
  if (!value || !VALID_ROLES.has(value)) return null
  return value as Role
}

/** Server session reader — trusts httpOnly cookies set at credential login. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const payload = readSessionCookies(store)

  if (!isSessionValid(payload)) return null

  const role = parseRole(payload.role)
  if (!role) return null

  return {
    sessionId: String(payload.sessionId),
    userId: payload.userId?.trim() || "",
    role,
    staffId: payload.staffId?.trim() || "",
    name: payload.name?.trim() || "",
    branchId: payload.branchId?.trim() || "",
    branchCode: payload.branchCode?.trim() || "",
    branchName: payload.branchName?.trim() || "",
    documentEntityCode:
      parseDocumentEntityCode(payload.documentEntityCode) ??
      DEFAULT_DOCUMENT_ENTITY_CODE,
  }
}
