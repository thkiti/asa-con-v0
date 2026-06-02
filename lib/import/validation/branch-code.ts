export function formatShopBranchCode(shopId: unknown): string {
  const raw = String(shopId ?? "").trim()
  if (!raw) return ""

  if (/^\d+$/.test(raw)) {
    return `SH${raw.padStart(3, "0")}`
  }

  return `SH${raw}`
}
