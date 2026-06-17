/** Date-only display for finance documents (DD.MM.YYYY). */
export function formatFinanceDocumentDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—"
  const isoDate = value.trim().slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

export type FinanceDocumentAuditLineInput = {
  documentNo: string
  entryDate: string
  createdAt: string
  submittedAt?: string | null
  confirmedAt?: string | null
  postedAt?: string | null
  cancelledAt?: string | null
}

/** Single-line audit summary for confirmed finance documents. */
export function buildFinanceDocumentAuditLine(input: FinanceDocumentAuditLineInput): string {
  const segments = [
    input.documentNo,
    `Entry Date: ${formatFinanceDocumentDate(input.entryDate)}`,
    `Created: ${formatFinanceDocumentDate(input.createdAt)}`,
  ]

  if (input.submittedAt) {
    segments.push(`Submitted: ${formatFinanceDocumentDate(input.submittedAt)}`)
  }
  if (input.confirmedAt) {
    segments.push(`Confirmed: ${formatFinanceDocumentDate(input.confirmedAt)}`)
  }
  if (input.postedAt) {
    segments.push(`Posted: ${formatFinanceDocumentDate(input.postedAt)}`)
  }
  if (input.cancelledAt) {
    segments.push(`Cancelled: ${formatFinanceDocumentDate(input.cancelledAt)}`)
  }

  return segments.join(" • ")
}
