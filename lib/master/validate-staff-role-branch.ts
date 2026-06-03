import type { BranchType, Role } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"

const HO_ROLES = new Set<Role>(["HO_ADMIN", "HO_FINANCE", "HO_OPERATIONS"])

export type AssignableBranch = {
  id: string
  type: BranchType
  isActive: boolean
  deleted: boolean
}

export function branchSupportsHoAdminAccess(branch: {
  type: string
  isActive: boolean
  deleted: boolean
}): boolean {
  return branch.type === "HO" && branch.isActive && !branch.deleted
}

export function assertStaffRoleBranch(role: Role, branch: AssignableBranch): void {
  if (branch.deleted || !branch.isActive) {
    throw new MasterDomainError(
      "Branch must be active and not deleted",
      "BRANCH_NOT_ASSIGNABLE",
      400
    )
  }

  if (role === "SH_STAFF" && branch.type !== "SH") {
    throw new MasterDomainError(
      "SH_STAFF must be assigned to a shop (SH) branch",
      "ROLE_BRANCH_MISMATCH",
      400
    )
  }

  if (HO_ROLES.has(role) && branch.type !== "HO") {
    throw new MasterDomainError(
      "Head office roles must be assigned to an HO branch",
      "ROLE_BRANCH_MISMATCH",
      400
    )
  }
}
