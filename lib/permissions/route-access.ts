import type { Role } from "@/lib/shared"
import { canAccessProductReference } from "./master"
import { roleHasArea, type AppArea } from "./roles"

/** Page paths HO_OPERATIONS may access under /master (Product & Reference only). */
const HO_OPERATIONS_MASTER_PATHS = [
  "/master/product-reference",
] as const

function isHoOperationsMasterPath(pathname: string): boolean {
  return HO_OPERATIONS_MASTER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

/** Master API routes required by the Product & Reference page for HO_OPERATIONS. */
function isHoOperationsProductReferenceApi(pathname: string): boolean {
  if (
    pathname === "/api/master/product-reference" ||
    pathname.startsWith("/api/master/product-reference/")
  ) {
    return true
  }
  if (pathname === "/api/master/products" || pathname.startsWith("/api/master/products/")) {
    return true
  }
  if (pathname.startsWith("/api/master/reference-stock/latest-hook-no")) {
    return true
  }
  return false
}

function isHoOperationsProductReferenceRoute(pathname: string): boolean {
  return (
    isHoOperationsMasterPath(pathname) || isHoOperationsProductReferenceApi(pathname)
  )
}

const AREA_PREFIX: Record<AppArea, string> = {
  finance: "/finance",
  admin: "/admin",
  operations: "/operations",
  shop: "/shop",
  system: "/system",
  master: "/master",
}

/** Paths that never require RBAC (still may require session — see middleware). */
export const PUBLIC_PATHS = ["/login", "/unauthorized", "/payment-evidence", "/staff-evidence"] as const

/** API paths skipped by route RBAC in middleware. */
export const API_BYPASS_PATHS = [
  "/api/health",
  "/api/auth/session",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/staff-preview",
  "/api/auth/branch-preview",
  "/api/auth/login-branches",
  "/api/finance",
  "/api/pos",
  "/api/stock-document",
  "/api/system",
  "/api/operation",
  "/api/catalog-image",
  "/api/repair-photo",
  "/api/payment-evidence",
  "/api/staff-evidence",
] as const

function pathnameArea(pathname: string): AppArea | null {
  if (pathname === "/api/master" || pathname.startsWith("/api/master/")) {
    return "master"
  }

  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    return "admin"
  }

  if (pathname === "/api/shop" || pathname.startsWith("/api/shop/")) {
    return "shop"
  }

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

  if (role === "HO_OPERATIONS" && isHoOperationsProductReferenceRoute(pathname)) {
    return canAccessProductReference(role)
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
