/** POS receipt cashier line: {staffId}-{staffName} or staffId only. */
export function formatCashierDisplay(
  staffId: string | null | undefined,
  staffName: string | null | undefined
): string | null {
  const id = String(staffId ?? "").trim()
  if (!id) return null
  const name = String(staffName ?? "").trim()
  return name ? `${id}-${name}` : id
}
