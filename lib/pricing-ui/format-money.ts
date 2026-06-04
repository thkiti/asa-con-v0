export function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return ""
  const n = Number(String(value).replace(/,/g, ""))
  if (!Number.isFinite(n)) return ""
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
