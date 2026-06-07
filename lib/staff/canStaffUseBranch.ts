import type { Role } from "@/generated/prisma/client"

export type LoginBranchGate = {
  id: string
  type: string
  isActive: boolean
  deleted: boolean
}

export type StaffBranchGate = {
  branchId: string
  role: Role
  allowAnyBranchLogin: boolean
}

/** Home branch match, or SH_STAFF replacer on an active shop branch. */
export function canStaffUseBranch(
  staff: StaffBranchGate,
  loginBranch: LoginBranchGate
): boolean {
  if (loginBranch.deleted || !loginBranch.isActive) return false
  if (staff.branchId === loginBranch.id) return true
  if (
    staff.role === "SH_STAFF" &&
    staff.allowAnyBranchLogin &&
    loginBranch.type === "SH"
  ) {
    return true
  }
  return false
}
