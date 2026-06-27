import type { Role } from "@/lib/shared"

/** HO roles (any role other than shop floor staff). */
export function isPosHoStaffRole(role: Role): boolean {
  return role !== "SH_STAFF"
}
