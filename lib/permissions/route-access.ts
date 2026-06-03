import type { Role } from "@/lib/shared"
import { roleHasArea, type AppArea } from "./roles"

const AREA_PREFIX: Record<AppArea, string> = {
  finance: "/finance",
  admin: "/admin",
  operations: "/operations",
  shop: "/shop",
  system: "/system",
  master: "/master",
}

/** Paths that never require RBAC (still may require session — see middleware). */
export const PUBLIC_PATHS = ["/login", "/unauthorized"] as const

/** API paths skipped by route RBAC in middleware. */
export const API_BYPASS_PATHS = [
  "/api/health",
  "/api/auth/session",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/finance",
  "/api/pos",
  "/api/stock-document",
  "/api/system",
] as const

function pathnameArea(pathname: string): AppArea | null {
  for (const [area, prefix] of Object.entries(AREA_PREFIX) as [
    AppArea,
    string,
  ][]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return area
    }
  }
  return null
}

/**
 * Pure route guard — no cookies, no Next.js imports.
 * Returns true when `role` may access `pathname`.
 */
export function canAccessRoute(
  pathname: string,
  role: Role | null | undefined
): boolean {
  if (!role) return false

  if (
    pathname === "/" ||
    pathname === "/main" ||
    pathname.startsWith("/main/") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return true
  }

  const area = pathnameArea(pathname)
  if (!area) {
    return false
  }

  return roleHasArea(role, area)
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function isApiBypassPath(pathname: string): boolean {
  return API_BYPASS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}