import type { SessionCookiePayload } from "./types"

/** Cookie names — single source for middleware and server session readers. */
export const SESSION_COOKIE = "sessionId"
export const USER_ID_COOKIE = "userId"
export const ROLE_COOKIE = "role"
export const STAFF_ID_COOKIE = "staffId"
export const STAFF_NAME_COOKIE = "staffName"
export const BRANCH_ID_COOKIE = "branchId"
export const BRANCH_CODE_COOKIE = "branchCode"
export const BRANCH_NAME_COOKIE = "branchName"
export const SESSION_EXPIRES_COOKIE = "sessionExpiresAt"

type CookieReader = {
  get(name: string): { value: string } | undefined
}

export function readSessionCookies(
  cookies: CookieReader
): SessionCookiePayload {
  return {
    sessionId: cookies.get(SESSION_COOKIE)?.value,
    userId: cookies.get(USER_ID_COOKIE)?.value,
    role: cookies.get(ROLE_COOKIE)?.value,
    staffId: cookies.get(STAFF_ID_COOKIE)?.value,
    name: cookies.get(STAFF_NAME_COOKIE)?.value,
    branchId: cookies.get(BRANCH_ID_COOKIE)?.value,
    branchCode: cookies.get(BRANCH_CODE_COOKIE)?.value,
    branchName: cookies.get(BRANCH_NAME_COOKIE)?.value,
    sessionExpiresAt: cookies.get(SESSION_EXPIRES_COOKIE)?.value,
  }
}

export function hasSessionCookies(payload: SessionCookiePayload): boolean {
  return Boolean(payload.sessionId?.trim() && payload.role?.trim())
}

/** True when required session cookies exist and expiry (if set) is still in the future. */
export function isSessionValid(payload: SessionCookiePayload): boolean {
  if (!hasSessionCookies(payload)) return false

  const expiresRaw = payload.sessionExpiresAt?.trim()
  if (!expiresRaw) return false

  const expiresMs = Number(expiresRaw)
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) return false

  return true
}
