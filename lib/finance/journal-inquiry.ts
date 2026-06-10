import type { PrismaClient } from "@/generated/prisma/client"
import { toMoney } from "./decimal"
import { loadJournalEntryWithLines } from "./journal-lineage"

export type JournalInquiryLine = {
  id: string
  lineNo: number
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type JournalInquiryResult = {
  id: string
  voucherId: string
  voucherNo: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  date: string
  branchId: string
  periodId: string
  postedAt: string
  reversalOfJournalEntryId: string | null
  isReversal: boolean
  isReversed: boolean
  reverses: {
    id: string
    voucherNo: string
  } | null
  reversedBy: {
    id: string
    voucherNo: string
  } | null
  lines: JournalInquiryLine[]
}

export type JournalInquiryPrisma = Pick<PrismaClient, "journalEntry">

export async function getJournalInquiryById(
  prisma: JournalInquiryPrisma,
  journalEntryId: string
): Promise<JournalInquiryResult> {
  const entry = await loadJournalEntryWithLines(prisma, journalEntryId)

  return {
    id: entry.id,
    voucherId: entry.voucherId,
    voucherNo: entry.voucher.voucherNo,
    refType: entry.voucher.refType,
    refId: entry.voucher.refId,
    refNo: entry.voucher.refNo,
    description: entry.voucher.description,
    date: entry.date.toISOString(),
    branchId: entry.branchId,
    periodId: entry.periodId,
    postedAt: entry.postedAt.toISOString(),
    reversalOfJournalEntryId: entry.reversalOfJournalEntryId,
    isReversal: entry.reversalOfJournalEntryId != null,
    isReversed: entry.reversedBy != null,
    reverses: entry.reverses
      ? { id: entry.reverses.id, voucherNo: entry.reverses.voucher.voucherNo }
      : null,
    reversedBy: entry.reversedBy
      ? {
          id: entry.reversedBy.id,
          voucherNo: entry.reversedBy.voucher.voucherNo,
        }
      : null,
    lines: entry.lines.map((line) => ({
      id: line.id,
      lineNo: line.lineNo,
      accountCode: line.glAccount.code,
      accountName: line.glAccount.name,
      debit: toMoney(line.debit).toString(),
      credit: toMoney(line.credit).toString(),
      memo: line.memo,
    })),
  }
}
