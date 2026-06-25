import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { toMoney } from "@/lib/finance/decimal"
import {
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import type {
  InvoiceVoucherLineRead,
  InvoiceVoucherListFilter,
  InvoiceVoucherListItem,
  InvoiceVoucherListResult,
  InvoiceVoucherRead,
} from "./invoice-voucher-read-types"

export type InvoiceVoucherReadPrisma = Pick<PrismaClient, "invoiceVoucher">

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function parseFilterDate(value: Date | string | undefined): Date | undefined {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvoiceVoucherError(
      "Invalid date filter",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

function buildWhere(filter: InvoiceVoucherListFilter): Prisma.InvoiceVoucherWhereInput {
  const where: Prisma.InvoiceVoucherWhereInput = {}

  if (filter.legalEntityCode) where.legalEntityCode = filter.legalEntityCode
  if (filter.status) where.status = filter.status
  if (filter.branchId) where.branchId = filter.branchId

  const search = filter.search?.trim()
  if (search) {
    where.OR = [
      { entryNo: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { refNo: { contains: search, mode: "insensitive" } },
    ]
  }

  const dateFrom = parseFilterDate(filter.dateFrom)
  const dateTo = parseFilterDate(filter.dateTo)
  if (dateFrom || dateTo) {
    where.invoiceDate = {}
    if (dateFrom) where.invoiceDate.gte = dateFrom
    if (dateTo) where.invoiceDate.lte = dateTo
  }

  return where
}

type EntryDetail = NonNullable<
  Awaited<ReturnType<InvoiceVoucherReadPrisma["invoiceVoucher"]["findFirst"]>>
> & {
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

function mapLine(line: EntryDetail["lines"][number]): InvoiceVoucherLineRead {
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

function mapEntry(entry: EntryDetail): InvoiceVoucherRead {
  const lines = [...entry.lines]
    .sort((a, b) => a.lineNo - b.lineNo)
    .map(mapLine)

  return {
    id: entry.id,
    entryNo: entry.entryNo,
    status: entry.status,
    branchId: entry.branchId,
    legalEntityCode: entry.legalEntityCode,
    invoiceDate: entry.invoiceDate.toISOString(),
    dueDate: toIso(entry.dueDate),
    customerName: entry.customerName,
    refNo: entry.refNo,
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

export async function getInvoiceVoucherById(
  db: InvoiceVoucherReadPrisma,
  entryId: string
): Promise<InvoiceVoucherRead | null> {
  const entry = await db.invoiceVoucher.findUnique({
    where: { id: entryId },
    include: {
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          glAccount: { select: { code: true, name: true } },
        },
      },
    },
  })

  if (!entry) return null
  return mapEntry(entry as EntryDetail)
}

export async function listInvoiceVouchers(
  db: InvoiceVoucherReadPrisma,
  filter: InvoiceVoucherListFilter = {}
): Promise<InvoiceVoucherListResult> {
  const where = buildWhere(filter)
  const limit = Math.min(Math.max(Number(filter.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)

  const [rows, total] = await Promise.all([
    db.invoiceVoucher.findMany({
      where,
      orderBy: [{ invoiceDate: "desc" }, { entryNo: "desc" }],
      take: limit,
      skip: offset,
      include: { _count: { select: { lines: true } } },
    }),
    db.invoiceVoucher.count({ where }),
  ])

  const entries: InvoiceVoucherListItem[] = rows.map((row) => ({
    id: row.id,
    entryNo: row.entryNo,
    status: row.status,
    branchId: row.branchId,
    legalEntityCode: row.legalEntityCode,
    invoiceDate: row.invoiceDate.toISOString(),
    dueDate: toIso(row.dueDate),
    customerName: row.customerName,
    totalAmount: toMoney(row.totalAmount).toString(),
    lineCount: row._count.lines,
    createdByStaffId: row.createdByStaffId,
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt.toISOString(),
  }))

  return { entries, total }
}
