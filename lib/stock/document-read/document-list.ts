import type { DocStatus, DocType, Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { decodeListCursor, encodeListCursor } from "./cursor"
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from "./constants"
import type {
  StockDocumentListItem,
  StockDocumentListQuery,
  StockDocumentListResult,
} from "./types"

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function mapListItem(
  row: {
    id: string
    refNo: string
    docType: DocType
    status: DocStatus
    date: Date
    periodMonth: string | null
    branchId: string
    fromLocId: string | null
    toLocId: string | null
    submittedAt: Date | null
    confirmedAt: Date | null
    postedAt: Date | null
    cancelledAt: Date | null
    createdAt: Date
    _count: { lines: number }
  }
): StockDocumentListItem {
  return {
    id: row.id,
    refNo: row.refNo,
    docType: row.docType,
    status: row.status,
    date: row.date.toISOString(),
    periodMonth: row.periodMonth,
    branchId: row.branchId,
    fromLocId: row.fromLocId,
    toLocId: row.toLocId,
    submittedAt: toIso(row.submittedAt),
    confirmedAt: toIso(row.confirmedAt),
    postedAt: toIso(row.postedAt),
    cancelledAt: toIso(row.cancelledAt),
    lineCount: row._count.lines,
    createdAt: row.createdAt.toISOString(),
  }
}

export function normalizeListLimit(limit: number | undefined): number {
  const n = Number(limit ?? DEFAULT_LIST_LIMIT)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIST_LIMIT
  return Math.min(Math.trunc(n), MAX_LIST_LIMIT)
}

function buildBranchWhere(branchId: string): Prisma.StockDocumentWhereInput {
  return {
    OR: [
      { branchId },
      { fromLocId: branchId },
      { toLocId: branchId },
    ],
  }
}

function buildCursorWhere(
  cursor: string | null | undefined
): Prisma.StockDocumentWhereInput | undefined {
  if (!cursor?.trim()) return undefined
  const decoded = decodeListCursor(cursor.trim())
  if (!decoded) return undefined

  const createdAt = new Date(decoded.createdAt)
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: decoded.id } },
    ],
  }
}

export async function listStockDocuments(
  prisma: PrismaClient,
  query: StockDocumentListQuery
): Promise<StockDocumentListResult> {
  const limit = normalizeListLimit(query.limit)
  const cursorWhere = buildCursorWhere(query.cursor)

  const where: Prisma.StockDocumentWhereInput = {
    AND: [
      buildBranchWhere(query.branchId),
      ...(query.docTypes?.length
        ? [{ docType: { in: [...query.docTypes] } }]
        : []),
      ...(query.docType ? [{ docType: query.docType }] : []),
      ...(query.status ? [{ status: query.status }] : []),
      ...(query.periodMonth ? [{ periodMonth: query.periodMonth }] : []),
      ...(query.fromDate ? [{ date: { gte: query.fromDate } }] : []),
      ...(query.toDate ? [{ date: { lte: query.toDate } }] : []),
      ...(cursorWhere ? [cursorWhere] : []),
    ],
  }

  const rows = await prisma.stockDocument.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      refNo: true,
      docType: true,
      status: true,
      date: true,
      periodMonth: true,
      branchId: true,
      fromLocId: true,
      toLocId: true,
      submittedAt: true,
      confirmedAt: true,
      postedAt: true,
      cancelledAt: true,
      createdAt: true,
      _count: { select: { lines: true } },
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const items = page.map(mapListItem)

  const last = page[page.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeListCursor({
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        })
      : null

  return { items, nextCursor, hasMore }
}
