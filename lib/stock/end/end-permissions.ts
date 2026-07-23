/**
 * Client-safe END role gates — no Prisma runtime, pg, or Node builtins.
 * Import this file by path; do not import via `@/lib/stock/end` barrel from Client Components.
 */
export function canViewEnd(role: string): boolean {
  const r = String(role ?? "").trim()
  return (
    r === "SH_STAFF" ||
    r === "HO_FINANCE" ||
    r === "HO_ADMIN" ||
    r === "HO_OPERATIONS"
  )
}

export function canRebuildEnd(role: string): boolean {
  const r = String(role ?? "").trim()
  return r === "HO_ADMIN" || r === "HO_FINANCE" || r === "HO_OPERATIONS"
}

export function canImportEnd(role: string): boolean {
  const r = String(role ?? "").trim()
  return r === "HO_ADMIN" || r === "HO_OPERATIONS"
}

export function canLockEnd(role: string): boolean {
  const r = String(role ?? "").trim()
  return r === "HO_ADMIN" || r === "HO_FINANCE" || r === "HO_OPERATIONS"
}

export function canSubmitEnd(role: string): boolean {
  return canLockEnd(role)
}

export function canReopenEnd(role: string): boolean {
  const r = String(role ?? "").trim()
  return r === "HO_ADMIN" || r === "HO_FINANCE"
}

export function canConfirmShopReceipt(role: string): boolean {
  return canViewEnd(role)
}
