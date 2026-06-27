import type { Prisma } from "@/generated/prisma/client"
import type {
  ManualJournalEntryStatus,
  ManualJournalEntryType,
  PrismaClient,
} from "@/generated/prisma/client"
import { toMoney } from "@/lib/finance/decimal"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import type {
  ManualJournalEntryLineRead,
  ManualJournalEntryListFilter,
  ManualJournalEntryListItem,
  ManualJournalEntryListResult,
  ManualJournalEntryRead,
} from "./manual-journal-entry-read-types"
import { isManualJournalPdfReadable } from "./manual-journal-entry-pdf-readiness"

export type ManualJournalEntryReadPrisma = Pick<
  PrismaClient,
  "manualJournalEntry"
>

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function parseFilterDate(value: Date | string | undefined): Date | undefined {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ManualJournalEntryError(
      "Invalid date filter",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  return date
}

function normalizeLimit(limit: number | undefined): number {
  const n = Number(limit ?? DEFAULT_LIMIT)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(Math.trunc(n), MAX_LIMIT)
}

function normalizeOffset(offset: number | undefined): number {
  const n = Number(offset ?? 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.trunc(n)
}

function buildWhere(filter: ManualJournalEntryListFilter): Prisma.ManualJournalEntryWhereInput {
  const where: Prisma.ManualJournalEntryWhereInput = {}

  if (!filter.legalEntityCode) {
    throw new ManualJournalEntryError(
      "legalEntityCode is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  where.legalEntityCode = filter.legalEntityCode
  if (filter.status) {
    where.status = filter.status
  }
  if (filter.entryType) {
    where.entryType = filter.entryType
  }
  if (filter.branchId) {
    where.branchId = filter.branchId
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

type EntryWithLines = Awaited<
  ReturnType<ManualJournalEntryReadPrisma["manualJournalEntry"]["findFirst"]>
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

function mapLine(line: EntryWithLines["lines"][number]): ManualJournalEntryLineRead {
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

function mapEntry(
  entry: NonNullable<EntryWithLines>,
  lines: ManualJournalEntryLineRead[]
): ManualJournalEntryRead {
  return {
    id: entry.id,
    entryNo: entry.entryNo,
    entryType: entry.entryType,
    status: entry.status,
    branchId: entry.branchId,
    legalEntityCode: entry.legalEntityCode,
    entryDate: entry.entryDate.toISOString(),
    description: entry.description,
    refNo: entry.refNo,
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
    reversalJournalEntryId: entry.reversalJournalEntryId,
    pdfPath: entry.pdfPath,
    pdfBlobUrl: entry.pdfBlobUrl ?? null,
    pdfGeneratedAt: toIso(entry.pdfGeneratedAt),
    pdfSnapshotReady: isManualJournalPdfReadable({
      status: entry.status,
      pdfPath: entry.pdfPath,
      pdfBlobUrl: entry.pdfBlobUrl,
    }),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    lines,
  }
}

function mapListItem(
  entry: {
    id: string
    entryNo: string
    entryType: ManualJournalEntryType
    status: ManualJournalEntryStatus
    branchId: string
    legalEntityCode: string
    entryDate: Date
    description: string | null
    refNo: string | null
    createdByStaffId: string
    submittedAt: Date | null
    submittedByStaffId: string | null
    confirmedAt: Date | null
    confirmedByStaffId: string | null
    postedAt: Date | null
    postedByStaffId: string | null
    cancelledAt: Date | null
    cancelledByStaffId: string | null
    cancelReason: string | null
    postedVoucherId: string | null
    postedJournalEntryId: string | null
    reversalJournalEntryId: string | null
    pdfPath: string | null
    pdfBlobUrl: string | null
    pdfGeneratedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: { lines: number }
  }
): ManualJournalEntryListItem {
  return {
    id: entry.id,
    entryNo: entry.entryNo,
    entryType: entry.entryType,
    status: entry.status,
    branchId: entry.branchId,
    legalEntityCode: entry.legalEntityCode,
    entryDate: entry.entryDate.toISOString(),
    description: entry.description,
    refNo: entry.refNo,
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
    reversalJournalEntryId: entry.reversalJournalEntryId,
    pdfPath: entry.pdfPath,
    pdfBlobUrl: entry.pdfBlobUrl ?? null,
    pdfGeneratedAt: toIso(entry.pdfGeneratedAt),
    pdfSnapshotReady: isManualJournalPdfReadable({
      status: entry.status,
      pdfPath: entry.pdfPath,
      pdfBlobUrl: entry.pdfBlobUrl,
    }),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    lineCount: entry._count.lines,
  }
}

export async function listManualJournalEntries(
  prisma: ManualJournalEntryReadPrisma,
  filter: ManualJournalEntryListFilter = {}
): Promise<ManualJournalEntryListResult> {
  const where = buildWhere(filter)
  const limit = normalizeLimit(filter.limit)
  const offset = normalizeOffset(filter.offset)

  const [rows, total] = await Promise.all([
    prisma.manualJournalEntry.findMany({
      where,
      orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
      take: limit,
      skip: offset,
      include: { _count: { select: { lines: true } } },
    }),
    prisma.manualJournalEntry.count({ where }),
  ])

  return {
    entries: rows.map(mapListItem),
    total,
  }
}

export async function getManualJournalEntryById(
  prisma: ManualJournalEntryReadPrisma,
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<ManualJournalEntryRead> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  if (!id) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const entry = await prisma.manualJournalEntry.findFirst({
    where: { id, legalEntityCode },
    include: {
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          glAccount: { select: { code: true, name: true } },
        },
      },
    },
  })

  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return mapEntry(entry, entry.lines.map(mapLine))
}
