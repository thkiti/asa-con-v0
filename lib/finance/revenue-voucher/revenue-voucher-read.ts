import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { toMoney } from "@/lib/finance/decimal"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import type {
  RevenueVoucherLineRead,
  RevenueVoucherListFilter,
  RevenueVoucherListItem,
  RevenueVoucherListResult,
  RevenueVoucherRead,
} from "./revenue-voucher-read-types"

export type RevenueVoucherReadPrisma = Pick<PrismaClient, "revenueVoucher">

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function parseFilterDate(value: Date | string | undefined): Date | undefined {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new RevenueVoucherError(
      "Invalid date filter",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

function buildWhere(filter: RevenueVoucherListFilter): Prisma.RevenueVoucherWhereInput {
  const where: Prisma.RevenueVoucherWhereInput = {}

  if (!filter.legalEntityCode) {
    throw new RevenueVoucherError(
      "legalEntityCode is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  where.legalEntityCode = filter.legalEntityCode
  if (filter.status) where.status = filter.status
  if (filter.branchId) where.branchId = filter.branchId

  const search = filter.search?.trim()
  if (search) {
    where.OR = [
      { entryNo: { contains: search, mode: "insensitive" } },
      { receivedFromName: { contains: search, mode: "insensitive" } },
      { refNo: { contains: search, mode: "insensitive" } },
    ]
  }

  const dateFrom = parseFilterDate(filter.dateFrom)
  const dateTo = parseFilterDate(filter.dateTo)
  if (dateFrom || dateTo) {
    where.entryDate = {}
    if (dateFrom) where.entryDate.gte = dateFrom
    if (dateTo) where.entryDate.lte = dateTo
  }

  return where
}

type EntryDetail = NonNullable<
  Awaited<ReturnType<RevenueVoucherReadPrisma["revenueVoucher"]["findFirst"]>>
> & {
  receiveToAccount: { code: string; name: string }
  lines: Array<{
    id: string
    lineNo: number
    glAccountId: string
    debit: Prisma.Decimal
    credit: Prisma.Decimal
    memo: string | null
    glAccount: { code: string; name: string }
  }>
}

function mapLine(line: EntryDetail["lines"][number]): RevenueVoucherLineRead {
  return {
    id: line.id,
    lineNo: line.lineNo,
    glAccountId: line.glAccountId,
    accountCode: line.glAccount.code,
    accountName: line.glAccount.name,
    debit: toMoney(line.debit).toString(),
    credit: toMoney(line.credit).toString(),
    memo: line.memo,
  }
}

function mapEntry(entry: EntryDetail): RevenueVoucherRead {
  const lines = [...entry.lines]
    .sort((a, b) => a.lineNo - b.lineNo)
    .map(mapLine)

  return {
    id: entry.id,
    entryNo: entry.entryNo,
    status: entry.status,
    branchId: entry.branchId,
    legalEntityCode: entry.legalEntityCode,
    entryDate: entry.entryDate.toISOString(),
    receiveToAccountId: entry.receiveToAccountId,
    receiveToAccountCode: entry.receiveToAccount.code,
    receiveToAccountName: entry.receiveToAccount.name,
    receivedFromName: entry.receivedFromName,
    refNo: entry.refNo,
    receiptNo: entry.receiptNo,
    description: entry.description,
    totalAmount: toMoney(entry.totalAmount).toString(),
    createdByStaffId: entry.createdByStaffId,
    submittedAt: toIso(entry.submittedAt),
    submittedByStaffId: entry.submittedByStaffId,
    confirmedAt: toIso(entry.confirmedAt),
    confirmedByStaffId: entry.confirmedByStaffId,
    postedAt: toIso(entry.postedAt),
    postedByStaffId: entry.postedByStaffId,
    cancelledAt: toIso(entry.cancelledAt),
    cancelledByStaffId: entry.cancelledByStaffId,
    cancelReason: entry.cancelReason,
    postedVoucherId: entry.postedVoucherId,
    postedJournalEntryId: entry.postedJournalEntryId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    lines,
  }
}

export async function getRevenueVoucherById(
  db: RevenueVoucherReadPrisma,
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<RevenueVoucherRead> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  if (!id) {
    throw new RevenueVoucherError(
      "entryId is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const entry = await db.revenueVoucher.findFirst({
    where: { id, legalEntityCode },
    include: {
      receiveToAccount: { select: { code: true, name: true } },
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          glAccount: { select: { code: true, name: true } },
        },
      },
    },
  })

  if (!entry) {
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }
  return mapEntry(entry as EntryDetail)
}

export async function listRevenueVouchers(
  db: RevenueVoucherReadPrisma,
  filter: RevenueVoucherListFilter = {}
): Promise<RevenueVoucherListResult> {
  const where = buildWhere(filter)
  const limit = Math.min(Math.max(Number(filter.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)

  const [rows, total] = await Promise.all([
    db.revenueVoucher.findMany({
      where,
      orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
      take: limit,
      skip: offset,
      include: { _count: { select: { lines: true } } },
    }),
    db.revenueVoucher.count({ where }),
  ])

  const entries: RevenueVoucherListItem[] = rows.map((row) => ({
    id: row.id,
    entryNo: row.entryNo,
    status: row.status,
    branchId: row.branchId,
    legalEntityCode: row.legalEntityCode,
    entryDate: row.entryDate.toISOString(),
    receivedFromName: row.receivedFromName,
    totalAmount: toMoney(row.totalAmount).toString(),
    lineCount: row._count.lines,
    createdByStaffId: row.createdByStaffId,
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt.toISOString(),
  }))

  return { entries, total }
}
