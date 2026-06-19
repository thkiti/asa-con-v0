import type { PrismaClient } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"

export type JournalLineagePrisma = Pick<
  PrismaClient,
  "journalEntry"
>

export type JournalLineageNode = {
  id: string
  voucherId: string
  date: Date
  reversalOfJournalEntryId: string | null
}

export type JournalLineageResult = {
  journal: JournalLineageNode
  reverses: JournalLineageNode | null
  reversedBy: JournalLineageNode | null
}

const lineageSelect = {
  id: true,
  voucherId: true,
  date: true,
  reversalOfJournalEntryId: true,
} as const

export async function loadJournalLineage(
  prisma: JournalLineagePrisma,
  journalEntryId: string
): Promise<JournalLineageResult> {
  const journal = await prisma.journalEntry.findUnique({
    where: { id: journalEntryId },
    select: {
      ...lineageSelect,
      reverses: { select: lineageSelect },
      reversedBy: { select: lineageSelect },
    },
  })

  if (!journal) {
    throw new FinancePostingError("Journal entry not found", "JOURNAL_NOT_FOUND")
  }

  return {
    journal: {
      id: journal.id,
      voucherId: journal.voucherId,
      date: journal.date,
      reversalOfJournalEntryId: journal.reversalOfJournalEntryId,
    },
    reverses: journal.reverses,
    reversedBy: journal.reversedBy,
  }
}

export async function loadJournalEntryWithLines(
  prisma: Pick<PrismaClient, "journalEntry">,
  journalEntryId: string
) {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: journalEntryId },
    select: {
      id: true,
      voucherId: true,
      date: true,
      branchId: true,
      periodId: true,
      postedAt: true,
      reversalOfJournalEntryId: true,
      legalEntityCode: true,
      voucher: {
        select: {
          id: true,
          voucherNo: true,
          refType: true,
          refId: true,
          refNo: true,
          description: true,
          status: true,
        },
      },
      lines: {
        orderBy: { lineNo: "asc" },
        select: {
          id: true,
          lineNo: true,
          debit: true,
          credit: true,
          memo: true,
          glAccount: { select: { code: true, name: true } },
        },
      },
      reverses: {
        select: {
          id: true,
          voucherId: true,
          voucher: { select: { voucherNo: true } },
        },
      },
      reversedBy: {
        select: {
          id: true,
          voucherId: true,
          voucher: { select: { voucherNo: true } },
        },
      },
    },
  })

  if (!entry) {
    throw new FinancePostingError("Journal entry not found", "JOURNAL_NOT_FOUND")
  }

  return entry
}
