import type { Role } from "@/generated/prisma/client"

import {
  BRANCH_CODE_COOKIE,
  BRANCH_ID_COOKIE,
  BRANCH_NAME_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
  STAFF_ID_COOKIE,
  STAFF_NAME_COOKIE,
  USER_ID_COOKIE,
} from "./cookies"
import type { SessionUser } from "./types"

type CookieStore = {
  set: (
    name: string,
    value: string,
    options?: {
      path?: string
      sameSite?: "lax" | "strict" | "none"
      httpOnly?: boolean
      maxAge?: number
    }
  ) => void
  delete: (options: { name: string; path?: string }) => void
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function setSessionCookies(
  cookies: CookieStore,
  user: SessionUser
): void {
  const base = {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
  }

  cookies.set(SESSION_COOKIE, user.sessionId, base)
  cookies.set(USER_ID_COOKIE, user.userId, base)
  cookies.set(ROLE_COOKIE, user.role as Role, base)
  cookies.set(STAFF_ID_COOKIE, user.staffId, base)
  cookies.set(STAFF_NAME_COOKIE, user.name, base)
  cookies.set(BRANCH_ID_COOKIE, user.branchId, base)
  cookies.set(BRANCH_CODE_COOKIE, user.branchCode, base)
  cookies.set(BRANCH_NAME_COOKIE, user.branchName, base)
}

export function clearSessionCookies(cookies: CookieStore): void {
  const base = { path: "/" }
  cookies.delete({ name: SESSION_COOKIE, ...base })
  cookies.delete({ name: USER_ID_COOKIE, ...base })
  cookies.delete({ name: ROLE_COOKIE, ...base })
  cookies.delete({ name: STAFF_ID_COOKIE, ...base })
  cookies.delete({ name: STAFF_NAME_COOKIE, ...base })
  cookies.delete({ name: BRANCH_ID_COOKIE, ...base })
  cookies.delete({ name: BRANCH_CODE_COOKIE, ...base })
  cookies.delete({ name: BRANCH_NAME_COOKIE, ...base })
}

export function createSessionUser(input: {
  sessionId: string
  role: Role
  staffId: string
  name: string
  branchId: string
  userId?: string
  branchCode?: string
  branchName?: string
}): SessionUser {
  return {
    sessionId: input.sessionId,
    userId: input.userId ?? "",
    role: input.role,
    staffId: input.staffId,
    name: input.name,
    branchId: input.branchId,
    branchCode: input.branchCode ?? "",
    branchName: input.branchName ?? "",
  }
}

export function resolveSafeReturnTo(returnTo: unknown, role: Role): string | null {
  const raw = String(returnTo ?? "").trim()
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null
  }

  if (raw.startsWith("/system/import") && role === "HO_ADMIN") {
    return raw
  }

  if (
    raw.startsWith("/main") ||
    raw.startsWith("/shop") ||
    raw.startsWith("/finance") ||
    raw.startsWith("/system")
  ) {
    return raw
  }

  return null
}

export function defaultRedirectForRole(_role: Role): string {
  return "/main"
}
