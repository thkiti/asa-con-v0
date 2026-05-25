import type { Role } from "@/lib/shared"

/** Area keys used for menu and route prefix checks. */
export type AppArea = "finance" | "admin" | "operations" | "shop"

/** Which top-level areas each role may access. */
export const ROLE_AREAS: Record<Role, readonly AppArea[]> = {
  HO_FINANCE: ["finance", "admin", "operations", "shop"],
  HO_ADMIN: ["finance", "admin", "operations", "shop"],
  HO_OPERATIONS: ["finance", "operations", "shop"],
  SH_STAFF: ["shop"],
}

export function roleHasArea(role: Role, area: AppArea): boolean {
  return ROLE_AREAS[role]?.includes(area) ?? false
}

/** Default landing route after login or when visiting `/`. */
export function roleLandingPath(role: Role): string {
  switch (role) {
    case "HO_FINANCE":
    case "HO_ADMIN":
      return "/finance"
    case "HO_OPERATIONS":
      return "/operations"
    case "SH_STAFF":
      return "/shop"
    default:
      return "/login"
  }
}