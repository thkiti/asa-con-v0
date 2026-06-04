export function formatReceiptMoney(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0.00"
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  })
}
