import type { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { FINANCE_REF_TYPES } from "./posting-types"
import { accountingPeriodUniqueWhere, resolvePeriodLegalEntityCode } from "./period-lookup"
import { addMoney, toMoney, ZERO } from "./decimal"

export type JournalListFilter = {
  branchId?: string
  periodKey?: string
  legalEntityCode?: DocumentEntityCode
  from?: Date | string
  to?: Date | string
  refType?: string
  limit?: number
  offset?: number
}

export type JournalListRow = {
  id: string
  voucherId: string
  voucherNo: string
  refType: string
  date: string
  branchId: string
  periodId: string
  description: string | null
  totalDebit: string
  totalCredit: string
  reversalOfJournalEntryId: string | null
  isReversal: boolean
  isReversed: boolean
  reversedByJournalId: string | null
  reversedByVoucherNo: string | null
}

export type JournalListResult = {
  journals: JournalListRow[]
  total: number
}

export type JournalListPrisma = Pick<PrismaClient, "journalEntry" | "accountingPeriod">

const MANUAL_REF_TYPES = [
  FINANCE_REF_TYPES.MANUAL_JOURNAL,
  FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL,
] as const

async function resolvePeriodId(
  prisma: JournalListPrisma,
  periodKey: string,
  legalEntityCode?: DocumentEntityCode | null
): Promise<string | null> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({
      periodKey,
      legalEntityCode: resolvePeriodLegalEntityCode(legalEntityCode),
    }),
    select: { id: true },
  })
  return period?.id ?? null
}

function buildWhere(
  filter: JournalListFilter,
  periodId: string | null
): Prisma.JournalEntryWhereInput {
  const where: Prisma.JournalEntryWhereInput = {
    voucher: {
      refType: {
        in: filter.refType
          ? [filter.refType]
          : [...MANUAL_REF_TYPES],
      },
    },
  }

  if (filter.branchId) {
    where.branchId = filter.branchId
  }
  if (periodId) {
    where.periodId = periodId
  }
  if (filter.from != null || filter.to != null) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (filter.from != null) {
      dateFilter.gte = new Date(filter.from)
    }
    if (filter.to != null) {
      const to = new Date(filter.to)
      to.setHours(23, 59, 59, 999)
      dateFilter.lte = to
    }
    where.date = dateFilter
  }

  return where
}

export async function listJournalEntries(
  prisma: JournalListPrisma,
  filter: JournalListFilter = {}
): Promise<JournalListResult> {
  let periodId: string | null = null
  if (filter.branchId && filter.periodKey) {
    periodId = await resolvePeriodId(
      prisma,
      filter.periodKey,
      filter.legalEntityCode
    )
    if (!periodId) {
      return { journals: [], total: 0 }
    }
  }

  const where = buildWhere(filter, periodId)
  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0

  const [rows, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        voucherId: true,
        date: true,
        branchId: true,
        periodId: true,
        reversalOfJournalEntryId: true,
        voucher: {
          select: {
            voucherNo: true,
            refType: true,
            description: true,
          },
        },
        lines: {
          select: { debit: true, credit: true },
        },
        reversedBy: {
          select: {
            id: true,
            voucher: { select: { voucherNo: true } },
          },
        },
      },
    }),
    prisma.journalEntry.count({ where }),
  ])

  const journals: JournalListRow[] = rows.map((row) => {
    let totalDebit = ZERO
    let totalCredit = ZERO
    for (const line of row.lines) {
      totalDebit = addMoney(totalDebit, toMoney(line.debit))
      totalCredit = addMoney(totalCredit, toMoney(line.credit))
    }
    return {
      id: row.id,
      voucherId: row.voucherId,
      voucherNo: row.voucher.voucherNo,
      refType: row.voucher.refType,
      date: row.date.toISOString(),
      branchId: row.branchId,
      periodId: row.periodId,
      description: row.voucher.description,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      reversalOfJournalEntryId: row.reversalOfJournalEntryId,
      isReversal: row.reversalOfJournalEntryId != null,
      isReversed: row.reversedBy != null,
      reversedByJournalId: row.reversedBy?.id ?? null,
      reversedByVoucherNo: row.reversedBy?.voucher.voucherNo ?? null,
    }
  })

  return { journals, total }
}
