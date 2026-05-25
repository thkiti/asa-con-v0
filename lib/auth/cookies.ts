import type { SessionCookiePayload } from "./types"

/** Cookie names — single source for middleware and server session readers. */
export const SESSION_COOKIE = "sessionId"
export const ROLE_COOKIE = "role"
export const STAFF_ID_COOKIE = "staffId"
export const STAFF_NAME_COOKIE = "staffName"
export const BRANCH_ID_COOKIE = "branchId"

type CookieReader = {
  get(name: string): { value: string } | undefined
}

export function readSessionCookies(
  cookies: CookieReader
): SessionCookiePayload {
  return {
    sessionId: cookies.get(SESSION_COOKIE)?.value,
    role: cookies.get(ROLE_COOKIE)?.value,
    staffId: cookies.get(STAFF_ID_COOKIE)?.value,
    name: cookies.get(STAFF_NAME_COOKIE)?.value,
    branchId: cookies.get(BRANCH_ID_COOKIE)?.value,
  }
}

export function hasSessionCookies(payload: SessionCookiePayload): boolean {
  return Boolean(payload.sessionId?.trim() && payload.role?.trim())
}