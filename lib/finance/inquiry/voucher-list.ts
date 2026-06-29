import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  accountingPeriodUniqueWhere,
  resolvePeriodLegalEntityCode,
} from "@/lib/finance/period-lookup"
import type {
  FinanceVoucherListFilter,
  FinanceVoucherListResult,
  FinanceVoucherListRow,
} from "./voucher-list-types"
import { applyVoucherInquiryRefTypeFilter } from "./voucher-document-types"

export type { FinanceVoucherListFilter, FinanceVoucherListResult, FinanceVoucherListRow } from "./voucher-list-types"

export { getVoucherDetailById as getFinanceVoucherDetail } from "@/lib/finance/voucher-read"

export type FinanceVoucherListPrisma = Pick<
  PrismaClient,
  "voucher" | "accountingPeriod"
>

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function parseFilterDate(value: Date | string | undefined): Date | undefined {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

async function resolvePeriodId(
  prisma: FinanceVoucherListPrisma,
  periodKey: string,
  legalEntityCode: FinanceVoucherListFilter["legalEntityCode"]
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
  filter: FinanceVoucherListFilter,
  periodId: string | null
): Prisma.VoucherWhereInput {
  const where: Prisma.VoucherWhereInput = {
    legalEntityCode: filter.legalEntityCode,
  }

  const voucherNo = filter.voucherNo?.trim()
  if (voucherNo) {
    where.voucherNo = { contains: voucherNo, mode: "insensitive" }
  }

  const refNo = filter.refNo?.trim()
  if (refNo) {
    where.refNo = { contains: refNo, mode: "insensitive" }
  }

  const refTypeIn = filter.refTypeIn
  if (refTypeIn?.length) {
    where.refType = { in: refTypeIn }
  } else {
    const refType = filter.refType?.trim()
    if (refType) {
      where.refType = refType
    }
  }

  if (periodId) {
    where.periodId = periodId
  }

  const dateFrom = parseFilterDate(filter.dateFrom)
  const dateTo = parseFilterDate(filter.dateTo)
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = dateFrom
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.date.lte = end
    }
  }

  return where
}

function sumLineTotals(
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
): { totalDebit: string; totalCredit: string } {
  let totalDebit = ZERO
  let totalCredit = ZERO
  for (const line of lines) {
    totalDebit = addMoney(totalDebit, toMoney(line.debit))
    totalCredit = addMoney(totalCredit, toMoney(line.credit))
  }
  return {
    totalDebit: totalDebit.toString(),
    totalCredit: totalCredit.toString(),
  }
}

export async function listFinanceVouchers(
  prisma: FinanceVoucherListPrisma,
  filter: FinanceVoucherListFilter
): Promise<FinanceVoucherListResult> {
  const scopedFilter = applyVoucherInquiryRefTypeFilter(filter)
  let periodId: string | null = null
  const periodKey = scopedFilter.periodKey?.trim()
  if (periodKey) {
    periodId = await resolvePeriodId(prisma, periodKey, scopedFilter.legalEntityCode)
    if (!periodId) {
      return { vouchers: [], total: 0 }
    }
  }

  const where = buildWhere(scopedFilter, periodId)
  const limit = Math.min(
    Math.max(Number(filter.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  )
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)

  const [rows, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy: [{ date: "desc" }, { voucherNo: "desc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        voucherNo: true,
        date: true,
        legalEntityCode: true,
        refType: true,
        refNo: true,
        description: true,
        status: true,
        period: { select: { periodKey: true } },
        journalEntry: {
          select: {
            lines: { select: { debit: true, credit: true } },
          },
        },
        lines: { select: { debit: true, credit: true } },
      },
    }),
    prisma.voucher.count({ where }),
  ])

  const vouchers: FinanceVoucherListRow[] = rows.map((row) => {
    const amountLines =
      row.journalEntry?.lines.length ? row.journalEntry.lines : row.lines
    const { totalDebit, totalCredit } = sumLineTotals(amountLines)

    return {
      id: row.id,
      voucherNo: row.voucherNo,
      date: row.date.toISOString(),
      legalEntityCode: row.legalEntityCode,
      periodKey: row.period.periodKey,
      refType: row.refType,
      refNo: row.refNo,
      description: row.description,
      status: row.status,
      totalDebit,
      totalCredit,
    }
  })

  return { vouchers, total }
}
