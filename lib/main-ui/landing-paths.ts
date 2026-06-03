import type { Role } from "@/lib/shared"

/** Branch staff daily screen — `/full-pos` when implemented (see docs/03_DOMAIN_MAP.md). */
export const BRANCH_STAFF_LANDING_PATH = "/shop"

export function branchStaffLandingPath(_role: Role): string {
  return BRANCH_STAFF_LANDING_PATH
}
