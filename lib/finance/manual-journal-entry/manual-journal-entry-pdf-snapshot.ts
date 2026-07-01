import type { ManualJournalEntryType, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import type { PostedVoucherResult } from "@/lib/finance/posting-types"
import {
  MANUAL_JOURNAL_ENTRY_PDF_SNAPSHOT_VERSION,
  type ManualJournalEntryPdfSnapshot,
  type ManualJournalEntryPdfSnapshotLine,
} from "./manual-journal-entry-pdf-snapshot-types"

const ENTRY_TYPE_LABEL: Record<ManualJournalEntryType, string> = {
  MANUAL: "Manual Journal Voucher",
  OPENING_BALANCE: "Opening Balance Journal",
  ADJUSTMENT: "Adjustment Journal",
  RECLASS: "Reclass Journal",
  ACCRUAL: "Accrual Journal",
  AUDITOR_ADJUSTMENT: "Auditor Adjustment Journal",
}

export type ManualJournalEntryPdfSnapshotSourceLine = {
  lineNo: number
  debit: Prisma.Decimal | number | string
  credit: Prisma.Decimal | number | string
  memo: string | null
  glAccount: { code: string; name: string }
}

export type ManualJournalEntryPdfSnapshotSource = {
  id: string
  entryNo: string
  entryType: ManualJournalEntryType
  branchId: string
  branchCode: string | null
  branchName: string | null
  legalEntityCode: string
  entryDate: Date
  description: string | null
  refNo: string | null
  createdAt: Date
  submittedAt: Date | null
  confirmedAt: Date | null
  postedAt: Date
  createdByStaffId: string
  submittedByStaffId: string | null
  confirmedByStaffId: string | null
  postedByStaffId: string
  lines: ManualJournalEntryPdfSnapshotSourceLine[]
}

function formatEntryDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function mapSnapshotLine(
  line: ManualJournalEntryPdfSnapshotSourceLine
): ManualJournalEntryPdfSnapshotLine {
  return {
    lineNo: line.lineNo,
    accountCode: line.glAccount.code,
    accountName: line.glAccount.name,
    debit: toMoney(line.debit).toString(),
    credit: toMoney(line.credit).toString(),
    memo: line.memo,
  }
}

/** Build immutable POST-time snapshot from in-memory posted entry data. */
export function buildManualJournalEntryPdfSnapshot(
  entry: ManualJournalEntryPdfSnapshotSource,
  posted: Pick<PostedVoucherResult, "voucherId" | "voucherNo" | "journalEntryId">
): ManualJournalEntryPdfSnapshot {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)
  const snapshotLines = sortedLines.map(mapSnapshotLine)

  let totalDebit = ZERO
  let totalCredit = ZERO
  for (const line of sortedLines) {
    totalDebit = addMoney(totalDebit, toMoney(line.debit))
    totalCredit = addMoney(totalCredit, toMoney(line.credit))
  }

  return {
    snapshotVersion: MANUAL_JOURNAL_ENTRY_PDF_SNAPSHOT_VERSION,
    entryId: entry.id,
    entryNo: entry.entryNo,
    entryType: entry.entryType,
    entryTypeLabel: ENTRY_TYPE_LABEL[entry.entryType],
    branchId: entry.branchId,
    branchCode: entry.branchCode,
    branchName: entry.branchName,
    legalEntityCode: entry.legalEntityCode,
    entryDate: formatEntryDate(entry.entryDate),
    description: entry.description,
    refNo: entry.refNo,
    createdAt: entry.createdAt.toISOString(),
    submittedAt: entry.submittedAt?.toISOString() ?? null,
    confirmedAt: entry.confirmedAt?.toISOString() ?? null,
    postedAt: entry.postedAt.toISOString(),
    createdByStaffId: entry.createdByStaffId,
    submittedByStaffId: entry.submittedByStaffId,
    confirmedByStaffId: entry.confirmedByStaffId,
    postedByStaffId: entry.postedByStaffId,
    postedVoucherId: posted.voucherId,
    postedVoucherNo: posted.voucherNo,
    postedJournalEntryId: posted.journalEntryId,
    lines: snapshotLines,
    totalDebit: totalDebit.toString(),
    totalCredit: totalCredit.toString(),
  }
}
