import type { Role } from "@/lib/shared"

/** Master Database maintenance — HO_ADMIN only (same bar as System Import). */
export function canAccessMasterDatabase(
  role: Role | null | undefined
): boolean {
  return role === "HO_ADMIN"
}
