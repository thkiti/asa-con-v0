import type { BranchPreview, StaffPreview } from "./login-preview"

export function isLoginBranchAllowed(
  staff: Pick<StaffPreview, "branchId" | "allowAnyBranchLogin" | "role">,
  branch: Pick<BranchPreview, "branchId" | "branchType">
): boolean {
  if (staff.role === "HO_ADMIN") {
    return staff.branchId === branch.branchId || branch.branchType === "SH"
  }
  if (staff.branchId === branch.branchId) return true
  if (staff.allowAnyBranchLogin && branch.branchType === "SH") return true
  return false
}
