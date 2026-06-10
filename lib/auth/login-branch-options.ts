import type { StaffPreview } from "./login-preview"

export type LoginBranchOption = {
  id: string
  code: string
  name: string
}

export function shouldLoadShopBranches(
  staffPreview: StaffPreview | null
): boolean {
  if (!staffPreview) return false
  if (staffPreview.allowAnyBranchLogin) return true
  return staffPreview.role === "HO_ADMIN"
}

export function resolveLoginBranchOptions(
  staffPreview: StaffPreview | null,
  shopBranches: LoginBranchOption[]
): LoginBranchOption[] {
  if (!staffPreview) return []

  if (staffPreview.allowAnyBranchLogin) {
    return shopBranches
  }

  if (staffPreview.role === "HO_ADMIN") {
    const home: LoginBranchOption = {
      id: staffPreview.branchId,
      code: staffPreview.branchCode,
      name: staffPreview.branchName,
    }
    const rest = shopBranches.filter((branch) => branch.id !== home.id)
    return [home, ...rest]
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
