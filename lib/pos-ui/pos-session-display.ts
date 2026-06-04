/** Branch: SH001 • Chidlom */
export function formatBranchDisplay(branchCode: string, branchName: string): string {
  return `${branchCode} • ${branchName}`
}

/** Staff: 103 • Somsak Kamnuch */
export function formatStaffDisplay(staffId: string, staffName: string): string {
  return `${staffId} • ${staffName}`
}

/** Receipt panel — preview, allocated number, or "-" if unknown. */
export function formatReceiptDisplay(receiptNo: string | null | undefined): string {
  const trimmed = receiptNo?.trim()
  return trimmed ? trimmed : "-"
}

/** After checkout show allocated no; otherwise next receipt preview. */
export function resolvePosReceiptPanelNo(
  lastReceiptNo: string | null | undefined,
  previewReceiptNo: string | null | undefined
): string | null {
  const last = lastReceiptNo?.trim()
  if (last) return last
  const preview = previewReceiptNo?.trim()
  return preview || null
}
