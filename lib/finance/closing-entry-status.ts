import type { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { toMoney, ZERO } from "./decimal"
import type { ClosingEntryStatus } from "./closing-entry-types"
import { FINANCE_REF_TYPES } from "./posting-types"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "./reports/retained-earnings"

export type ClosingEntryStatusPrisma = Pick<PrismaClient, "voucher"> &
  Partial<Prisma.TransactionClient>

type JournalLineWithAccount = {
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  glAccount: { code: string }
}

function extractNetIncomeFromJournalLines(
  lines: JournalLineWithAccount[],
  retainedEarningsAccountCode: string
): string {
  const reLine = lines.find(
    (line) => line.glAccount.code === retainedEarningsAccountCode
  )
  if (!reLine) {
    return ZERO.toString()
  }

  const credit = toMoney(reLine.credit)
  const debit = toMoney(reLine.debit)
  if (credit.gt(ZERO)) {
    return credit.toString()
  }
  if (debit.gt(ZERO)) {
    return toMoney(debit).negated().toString()
  }
  return ZERO.toString()
}

function mapVoucherToClosingEntryStatus(
  voucher: {
    id: string
    voucherNo: string
    refId: string
    postedAt: Date | null
    journalEntry: {
      id: string
      reversedBy: { id: string } | null
      lines: JournalLineWithAccount[]
    } | null
  },
  retainedEarningsAccountCode: string
): ClosingEntryStatus | null {
  if (!voucher.journalEntry) {
    return null
  }

  const isReversed = voucher.journalEntry.reversedBy != null
  const netIncome = extractNetIncomeFromJournalLines(
    voucher.journalEntry.lines,
    retainedEarningsAccountCode
  )

  return {
    voucherId: voucher.id,
    voucherNo: voucher.voucherNo,
    journalEntryId: voucher.journalEntry.id,
    refId: voucher.refId,
    netIncome,
    lineCount: voucher.journalEntry.lines.length,
    postedAt: (voucher.postedAt ?? new Date()).toISOString(),
    isActive: !isReversed,
    isReversed,
    reversedByJournalId: voucher.journalEntry.reversedBy?.id ?? null,
  }
}

const closingEntryVoucherInclude = {
  journalEntry: {
    include: {
      reversedBy: { select: { id: true } },
      lines: {
        orderBy: { lineNo: "asc" as const },
        include: { glAccount: { select: { code: true } } },
      },
    },
  },
} as const

export async function listClosingEntriesForPeriod(
  tx: ClosingEntryStatusPrisma,
  periodId: string,
  retainedEarningsAccountCode = RETAINED_EARNINGS_ACCOUNT_CODE
): Promise<ClosingEntryStatus[]> {
  const vouchers = await tx.voucher.findMany({
    where: {
      periodId,
      refType: FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY,
    },
    orderBy: { createdAt: "asc" },
    include: closingEntryVoucherInclude,
  })

  const entries: ClosingEntryStatus[] = []
  for (const voucher of vouchers) {
    const status = mapVoucherToClosingEntryStatus(
      voucher,
      retainedEarningsAccountCode
    )
    if (status) {
      entries.push(status)
    }
  }
  return entries
}

export async function getActiveClosingEntry(
  tx: ClosingEntryStatusPrisma,
  periodId: string,
  retainedEarningsAccountCode = RETAINED_EARNINGS_ACCOUNT_CODE
): Promise<ClosingEntryStatus | null> {
  const vouchers = await tx.voucher.findMany({
    where: {
      periodId,
      refType: FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY,
    },
    orderBy: { createdAt: "desc" },
    include: closingEntryVoucherInclude,
  })

  for (const voucher of vouchers) {
    const status = mapVoucherToClosingEntryStatus(
      voucher,
      retainedEarningsAccountCode
    )
    if (status?.isActive) {
      return status
    }
  }
  return null
}

export function allocateClosingEntryRefId(
  periodId: string,
  entries: ClosingEntryStatus[]
): string {
  const baseRefId = periodId
  const baseEntry = entries.find((entry) => entry.refId === baseRefId)

  if (!baseEntry) {
    return baseRefId
  }

  if (baseEntry.isActive) {
    return baseRefId
  }

  let maxSuffix = 1
  for (const entry of entries) {
    if (!entry.refId.startsWith(`${periodId}:`)) {
      continue
    }
    const suffixRaw = entry.refId.slice(periodId.length + 1)
    const suffix = Number.parseInt(suffixRaw, 10)
    if (Number.isFinite(suffix) && suffix > maxSuffix) {
      maxSuffix = suffix
    }
  }

  return `${periodId}:${maxSuffix + 1}`
}

export function closingEntryNetIncomesMatch(
  left: string,
  right: string
): boolean {
  return toMoney(left).equals(toMoney(right))
}
