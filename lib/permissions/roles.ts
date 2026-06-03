import type { Role } from "@/lib/shared"

/** Area keys used for menu and route prefix checks. */
export type AppArea =
  | "finance"
  | "admin"
  | "operations"
  | "shop"
  | "system"
  | "master"

/** Which top-level areas each role may access. */
export const ROLE_AREAS: Record<Role, readonly AppArea[]> = {
  HO_FINANCE: ["finance", "admin", "operations", "shop"],
  HO_ADMIN: ["finance", "admin", "operations", "shop", "system", "master"],
  HO_OPERATIONS: ["finance", "operations", "shop"],
  SH_STAFF: ["shop"],
}

export function roleHasArea(role: Role, area: AppArea): boolean {
  return ROLE_AREAS[role]?.includes(area) ?? false
}

/** Default landing route after login or when visiting `/`. */
export function roleLandingPath(_role: Role): string {
  return "/main"
}