import type { StaffPreview } from "./login-preview"

export type LoginBranchOption = {
  id: string
  code: string
  name: string
}

export function shouldLoadShopBranches(
  staffPreview: StaffPreview | null
): boolean {
  return Boolean(staffPreview?.allowAnyBranchLogin)
}

export function resolveLoginBranchOptions(
  staffPreview: StaffPreview | null,
  shopBranches: LoginBranchOption[]
): LoginBranchOption[] {
  if (!staffPreview) return []

  if (staffPreview.allowAnyBranchLogin) {
    return shopBranches
  }

  const home = shopBranches.find((branch) => branch.id === staffPreview.branchId)
  if (home) return [home]

  return [
    {
      id: staffPreview.branchId,
      code: staffPreview.branchCode,
      name: staffPreview.branchName,
    },
  ]
}

export function formatLoginBranchOptionLabel(option: LoginBranchOption): string {
  return `${option.code} - ${option.name}`
}
