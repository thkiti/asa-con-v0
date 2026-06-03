import type { Role } from "@/lib/shared"
import { branchStaffLandingPath } from "@/lib/main-ui/landing-paths"

function usesHoMainMenu(role: Role): boolean {
  return role !== "SH_STAFF"
}

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
export function roleLandingPath(role: Role): string {
  if (!usesHoMainMenu(role)) {
    return branchStaffLandingPath(role)
  }
  return "/main"
}