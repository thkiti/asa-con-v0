import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "../errors"

const RECEIPT_ARCHIVE_PREFIX = "documents/receipt"
const RECEIPT_NO_PATTERN = /^REC-[A-Z0-9]+-\d{6}-\d{4}$/

export function assertSafeReceiptNo(receiptNo: string): string {
  const trimmed = String(receiptNo ?? "").trim()
  if (!trimmed || !RECEIPT_NO_PATTERN.test(trimmed)) {
    throw new DocumentArchiveError(
      "Invalid receipt number for archive PDF path",
      DocumentArchiveErrorCodes.INVALID_RECEIPT_NO
    )
  }
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    throw new DocumentArchiveError(
      "Invalid receipt number for archive PDF path",
      DocumentArchiveErrorCodes.INVALID_RECEIPT_NO
    )
  }
  return trimmed
}

/**
 * documents/receipt/{YYYY}/{MM}/{receiptNo}.pdf
 * Year/month from issuedAt in Asia/Bangkok calendar.
 */
export function buildReceiptArchivePdfPathname(
  receiptNo: string,
  issuedAt: Date
): string {
  const safeReceiptNo = assertSafeReceiptNo(receiptNo)
  const { y, m } = bangkokCalendarParts(issuedAt)
  const month = String(m).padStart(2, "0")
  return `${RECEIPT_ARCHIVE_PREFIX}/${y}/${month}/${safeReceiptNo}.pdf`
}
