import type { BranchPreview, StaffPreview } from "./login-preview"

export function isLoginBranchAllowed(
  staff: Pick<StaffPreview, "branchId" | "allowAnyBranchLogin">,
  branch: Pick<BranchPreview, "branchId" | "branchType">
): boolean {
  if (staff.branchId === branch.branchId) return true
  if (staff.allowAnyBranchLogin && branch.branchType === "SH") return true
  return false
}
