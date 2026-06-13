import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import type { BranchListItem } from "./types"
import { MasterDomainError } from "./errors"

export function parseOptionalBranchContactField(
  value: unknown,
  field: string,
  maxLen: number
): string | null {
  if (value === undefined || value === null) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (raw.length > maxLen) {
    throw new MasterDomainError(
      `${field} must be at most ${maxLen} characters`,
      "VALIDATION_ERROR",
      400
    )
  }
  return raw
}

export function branchTaxIdFieldLabel(code: string): string {
  return code.trim().toUpperCase() === "HO999"
    ? "Company Tax ID"
    : "Machine / POS Approval ID"
}

/** Client-safe branch code preview for tax ID label (no Prisma / server imports). */
export function previewBranchCodeForTaxLabel(
  rawCode: string,
  type: "HO" | "SH"
): string {
  const trimmed = rawCode.trim().toUpperCase()
  if (!trimmed) return "SH"
  if (type === "SH" && /^\d+$/.test(trimmed)) {
    return formatShopBranchCode(trimmed)
  }
  return trimmed
}

/** Table column: company tax ID for HO branches only. */
export function branchListTaxIdDisplay(row: Pick<BranchListItem, "type" | "taxId">): string {
  return row.type === "HO" ? (row.taxId ?? "") : ""
}

/** Table column: machine / POS approval ID for shop branches only. */
export function branchListMachineNoDisplay(
  row: Pick<BranchListItem, "type" | "taxId">
): string {
  return row.type === "SH" ? (row.taxId ?? "") : ""
}
