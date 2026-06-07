import type { SessionUser } from "@/lib/auth/types"
import type { Role } from "@/lib/shared"
import { CatalogImageError } from "./errors"

const CATALOG_IMAGE_ROLES: ReadonlySet<Role> = new Set([
  "HO_FINANCE",
  "HO_ADMIN",
  "HO_OPERATIONS",
])

export function requireCatalogImageSession(
  session: SessionUser | null
): SessionUser {
  if (!session) {
    throw new CatalogImageError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }
  if (!CATALOG_IMAGE_ROLES.has(session.role)) {
    throw new CatalogImageError("Access denied", "FORBIDDEN", 403)
  }
  return session
}
