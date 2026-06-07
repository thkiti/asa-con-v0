import type { StaffListItem } from "./types"

export function toStaffListItem(row: {
  id: string
  staffId: string
  name: string
  role: StaffListItem["role"]
  deleted: boolean
  branchId: string
  posCanCollect: boolean
  allowAnyBranchLogin: boolean
  branch: { code: string; name: string }
}): StaffListItem {
  return {
    id: row.id,
    staffId: row.staffId,
    name: row.name,
    role: row.role,
    deleted: row.deleted,
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
    posCanCollect: row.posCanCollect,
    allowAnyBranchLogin: row.allowAnyBranchLogin,
  }
}

export const staffSelectWithBranch = {
  id: true,
  staffId: true,
  name: true,
  role: true,
  deleted: true,
  branchId: true,
  posCanCollect: true,
  allowAnyBranchLogin: true,
  branch: {
    select: { code: true, name: true },
  },
} as const
