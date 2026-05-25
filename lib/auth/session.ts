import { cookies } from "next/headers"
import type { Role } from "@/lib/shared"
import { readSessionCookies, hasSessionCookies } from "./cookies"
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

/**
 * Server session reader — Phase 2 stub.
 * Trusts cookie values only; no DB / Staff lookup until real login (later phase).
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const payload = readSessionCookies(store)

  if (!hasSessionCookies(payload)) return null

  const role = parseRole(payload.role)
  if (!role) return null

  return {
    sessionId: String(payload.sessionId),
    role,
    staffId: payload.staffId?.trim() || "",
    name: payload.name?.trim() || "",
    branchId: payload.branchId?.trim() || "",
  }
}