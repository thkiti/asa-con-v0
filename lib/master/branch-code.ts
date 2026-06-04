import { BranchType } from "@/lib/shared/types"
import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import { MasterDomainError } from "./errors"

export function normalizeBranchCodeForCreate(
  rawCode: string,
  type: BranchType
): string {
  const trimmed = rawCode.trim().toUpperCase()
  if (!trimmed) {
    throw new MasterDomainError("Branch code is required", "VALIDATION_ERROR", 400)
  }

  if (type === BranchType.SH && /^\d+$/.test(trimmed)) {
    return formatShopBranchCode(trimmed)
  }

  return trimmed
}
