// Next.js 16 deprecates middleware in favor of proxy; this file intentionally remains middleware (no rewrite).
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { readSessionCookies, isSessionValid } from "@/lib/auth/cookies"
import {
  canAccessRoute,
  isPublicPath,
  isApiBypassPath,
  roleLandingPath,
} from "@/lib/permissions"
import type { Role } from "@/lib/shared"

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

function parseRole(value: string | undefined): Role | null {
  const roles: Role[] = [
    "HO_FINANCE",
    "HO_ADMIN",
    "HO_OPERATIONS",
    "SH_STAFF",
  ]
  if (!value) return null
  return roles.includes(value as Role) ? (value as Role) : null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/fonts/") ||
    isApiBypassPath(pathname)
  ) {
    return nextWithPathname(request)
  }

  const payload = readSessionCookies(request.cookies)
  const role = parseRole(payload.role)
  const authenticated = isSessionValid(payload) && role !== null

  if (isPublicPath(pathname)) {
    return nextWithPathname(request)
  }

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(
      loginUrl,
      request.method === "GET" ? 307 : 303
    )
  }

  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL(roleLandingPath(role!), request.url))
  }

  if (
    role === "SH_STAFF" &&
    (pathname === "/main" || pathname.startsWith("/main/"))
  ) {
    return NextResponse.redirect(
      new URL(roleLandingPath(role!), request.url)
    )
  }

  if (!canAccessRoute(pathname, role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const unauthorizedUrl = new URL("/unauthorized", request.url)
    return NextResponse.redirect(
      unauthorizedUrl,
      request.method === "GET" ? 307 : 303
    )
  }

  return nextWithPathname(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
