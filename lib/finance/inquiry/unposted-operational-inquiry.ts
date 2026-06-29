import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type {
  FinanceDocumentInquiryFilter,
  FinanceDocumentInquiryRow,
} from "./finance-document-inquiry-types"
import {
  matchesAmountRange,
  matchesPdfStateFilter,
} from "./finance-document-inquiry-helpers"
import {
  buildUnpostedOperationalInquiryPath,
  buildUnpostedOperationalPrintPath,
} from "./finance-document-inquiry-links"
import {
  resolveVoucherInquiryRefTypeFilter,
  VOUCHER_INQUIRY_DOC_TYPE,
} from "./voucher-document-types"
import { parsePeriodDateRange } from "./voucher-list"

export type UnpostedOperationalInquiryPrisma = Pick<
  PrismaClient,
  "manualJournalEntry" | "paymentVoucher" | "revenueVoucher" | "pettyCashVoucher"
>

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

const OPERATIONAL_DOC_TYPES = new Set<string>([
  VOUCHER_INQUIRY_DOC_TYPE.MJV,
  VOUCHER_INQUIRY_DOC_TYPE.OPB,
  VOUCHER_INQUIRY_DOC_TYPE.PAV,
  VOUCHER_INQUIRY_DOC_TYPE.REV,
  VOUCHER_INQUIRY_DOC_TYPE.PCV,
])

function parseFilterDate(value: Date | string | undefined): Date | undefined {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function resolveOperationalDocTypes(filter: FinanceDocumentInquiryFilter): Set<string> | null {
  const resolved = resolveVoucherInquiryRefTypeFilter(filter.refType)
  if (!resolved.refType && !resolved.refTypeIn?.length) {
    return null
  }

  const docType = filter.refType?.trim()
  if (!docType) return null
  if (!OPERATIONAL_DOC_TYPES.has(docType)) {
    return new Set()
  }
  return new Set([docType])
}

function resolveOperationalStatusFilter(
  filter: FinanceDocumentInquiryFilter
): Prisma.EnumManualJournalEntryStatusFilter | undefined {
  const postingState = filter.postingState ?? "all"
  const status = filter.status?.trim()

  if (status) {
    if (status === "VOIDED") return undefined
    return { equals: status as "DRAFT" | "SUBMITTED" | "CONFIRMED" | "POSTED" | "CANCELLED" }
  }

  if (postingState === "posted") {
    return { equals: "POSTED" }
  }

  if (postingState === "unposted" || postingState === "all") {
    return { notIn: ["POSTED", "CANCELLED"] }
  }

  return undefined
}

function buildSharedOperationalWhere(
  filter: FinanceDocumentInquiryFilter
): Prisma.ManualJournalEntryWhereInput {
  const where: Prisma.ManualJournalEntryWhereInput = {
    legalEntityCode: filter.legalEntityCode,
    postedVoucherId: null,
  }

  if (filter.branchId?.trim()) {
    where.branchId = filter.branchId.trim()
  }

  const statusFilter = resolveOperationalStatusFilter(filter)
  if (statusFilter) {
    where.status = statusFilter
  }

  const periodKey = filter.periodKey?.trim()
  const periodRange = periodKey ? parsePeriodDateRange(periodKey) : null
  const dateFrom = parseFilterDate(filter.dateFrom) ?? periodRange?.from
  const dateTo = parseFilterDate(filter.dateTo) ?? periodRange?.to
  if (dateFrom || dateTo) {
    where.entryDate = {}
    if (dateFrom) where.entryDate.gte = dateFrom
    if (dateTo) where.entryDate.lte = dateTo
  }

  const refNo = filter.refNo?.trim()
  if (refNo) {
    where.OR = [
      { entryNo: { contains: refNo, mode: "insensitive" } },
      { refNo: { contains: refNo, mode: "insensitive" } },
    ]
  }

  return where
}

function sumManualJournalAmount(
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
): string {
  let total = ZERO
  for (const line of lines) {
    total = addMoney(total, toMoney(line.debit))
  }
  return total.toString()
}

type BranchSelect = { code: string; name: string }

function mapManualJournalRow(
  row: {
    id: string
    entryNo: string
    entryType: string
    entryDate: Date
    legalEntityCode: string
    status: string
    branchId: string
    branch: BranchSelect
    pdfPath: string | null
    lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
  },
  documentTypeCode: string
): FinanceDocumentInquiryRow {
  const amount = sumManualJournalAmount(row.lines)
  const pdfAvailable =
    row.status === "POSTED" ? Boolean(String(row.pdfPath ?? "").trim()) : false

  return {
    id: row.id,
    rowKind: "unposted",
    legalEntityCode: row.legalEntityCode,
    documentTypeCode,
    documentNo: row.entryNo,
    voucherNo: null,
    date: row.entryDate.toISOString(),
    periodKey: null,
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
    status: row.status,
    amount,
    journalEntryId: null,
    operationalDocumentId: row.id,
    pdfAvailable,
    inquiryPath: buildUnpostedOperationalInquiryPath({
      documentTypeCode,
      id: row.id,
    }),
    printPath: buildUnpostedOperationalPrintPath({
      documentTypeCode,
      id: row.id,
      status: row.status,
    }),
  }
}

function mapAmountVoucherRow(
  row: {
    id: string
    entryNo: string
    entryDate: Date
    legalEntityCode: string
    status: string
    branchId: string
    branch: BranchSelect
    totalAmount: Prisma.Decimal
  },
  documentTypeCode: string
): FinanceDocumentInquiryRow {
  const amount = toMoney(row.totalAmount).toString()

  return {
    id: row.id,
    rowKind: "unposted",
    legalEntityCode: row.legalEntityCode,
    documentTypeCode,
    documentNo: row.entryNo,
    voucherNo: null,
    date: row.entryDate.toISOString(),
    periodKey: null,
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
    status: row.status,
    amount,
    journalEntryId: null,
    operationalDocumentId: row.id,
    pdfAvailable: null,
    inquiryPath: buildUnpostedOperationalInquiryPath({
      documentTypeCode,
      id: row.id,
    }),
    printPath: null,
  }
}

function applyRowFilters(
  rows: FinanceDocumentInquiryRow[],
  filter: FinanceDocumentInquiryFilter
): FinanceDocumentInquiryRow[] {
  return rows.filter((row) => {
    if (!matchesAmountRange(row.amount, filter.amountMin, filter.amountMax)) {
      return false
    }
    if (!matchesPdfStateFilter(row.pdfAvailable, filter.pdfState)) {
      return false
    }
    return true
  })
}

export async function listUnpostedOperationalDocuments(
  prisma: UnpostedOperationalInquiryPrisma,
  filter: FinanceDocumentInquiryFilter
): Promise<{ documents: FinanceDocumentInquiryRow[]; total: number }> {
  const postingState = filter.postingState ?? "all"
  if (postingState === "posted") {
    return { documents: [], total: 0 }
  }

  const docTypes = resolveOperationalDocTypes(filter)
  if (docTypes && docTypes.size === 0) {
    return { documents: [], total: 0 }
  }

  const includeMjv =
    !docTypes || docTypes.has(VOUCHER_INQUIRY_DOC_TYPE.MJV)
  const includeOpb =
    !docTypes || docTypes.has(VOUCHER_INQUIRY_DOC_TYPE.OPB)
  const includePav =
    !docTypes || docTypes.has(VOUCHER_INQUIRY_DOC_TYPE.PAV)
  const includeRev =
    !docTypes || docTypes.has(VOUCHER_INQUIRY_DOC_TYPE.REV)
  const includePcv =
    !docTypes || docTypes.has(VOUCHER_INQUIRY_DOC_TYPE.PCV)

  const sharedWhere = buildSharedOperationalWhere(filter)
  const rows: FinanceDocumentInquiryRow[] = []

  if (includeMjv || includeOpb) {
    const manualWhere: Prisma.ManualJournalEntryWhereInput = {
      ...sharedWhere,
      postedVoucherId: null,
    }
    if (includeMjv && !includeOpb) {
      manualWhere.entryType = { not: "OPENING_BALANCE" }
    } else if (includeOpb && !includeMjv) {
      manualWhere.entryType = "OPENING_BALANCE"
    }

    const manualRows = await prisma.manualJournalEntry.findMany({
      where: manualWhere,
      orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
      take: MAX_LIMIT,
      select: {
        id: true,
        entryNo: true,
        entryType: true,
        entryDate: true,
        legalEntityCode: true,
        status: true,
        branchId: true,
        branch: { select: { code: true, name: true } },
        pdfPath: true,
        lines: { select: { debit: true, credit: true } },
      },
    })

    for (const row of manualRows) {
      const documentTypeCode =
        row.entryType === "OPENING_BALANCE"
          ? VOUCHER_INQUIRY_DOC_TYPE.OPB
          : VOUCHER_INQUIRY_DOC_TYPE.MJV
      rows.push(mapManualJournalRow(row, documentTypeCode))
    }
  }

  const voucherSharedWhere = {
    legalEntityCode: filter.legalEntityCode,
    postedVoucherId: null,
    ...(filter.branchId?.trim() ? { branchId: filter.branchId.trim() } : {}),
    ...(resolveOperationalStatusFilter(filter)
      ? { status: resolveOperationalStatusFilter(filter) }
      : {}),
  }

  const periodKey = filter.periodKey?.trim()
  const periodRange = periodKey ? parsePeriodDateRange(periodKey) : null
  const dateFrom = parseFilterDate(filter.dateFrom) ?? periodRange?.from
  const dateTo = parseFilterDate(filter.dateTo) ?? periodRange?.to
  const entryDateFilter =
    dateFrom || dateTo
      ? {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        }
      : undefined

  const refNo = filter.refNo?.trim()
  const searchOr = refNo
    ? [
        { entryNo: { contains: refNo, mode: "insensitive" as const } },
        { refNo: { contains: refNo, mode: "insensitive" as const } },
      ]
    : undefined

  if (includePav) {
    const pavRows = await prisma.paymentVoucher.findMany({
      where: {
        ...voucherSharedWhere,
        ...(entryDateFilter ? { entryDate: entryDateFilter } : {}),
        ...(searchOr ? { OR: searchOr } : {}),
      },
      orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
      take: MAX_LIMIT,
      select: {
        id: true,
        entryNo: true,
        entryDate: true,
        legalEntityCode: true,
        status: true,
        branchId: true,
        branch: { select: { code: true, name: true } },
        totalAmount: true,
      },
    })
    rows.push(
      ...pavRows.map((row) => mapAmountVoucherRow(row, VOUCHER_INQUIRY_DOC_TYPE.PAV))
    )
  }

  if (includeRev) {
    const revRows = await prisma.revenueVoucher.findMany({
      where: {
        ...voucherSharedWhere,
        ...(entryDateFilter ? { entryDate: entryDateFilter } : {}),
        ...(searchOr ? { OR: searchOr } : {}),
      },
      orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
      take: MAX_LIMIT,
      select: {
        id: true,
        entryNo: true,
        entryDate: true,
        legalEntityCode: true,
        status: true,
        branchId: true,
        branch: { select: { code: true, name: true } },
        totalAmount: true,
      },
    })
    rows.push(
      ...revRows.map((row) => mapAmountVoucherRow(row, VOUCHER_INQUIRY_DOC_TYPE.REV))
    )
  }

  if (includePcv) {
    const pcvRows = await prisma.pettyCashVoucher.findMany({
      where: {
        ...voucherSharedWhere,
        ...(entryDateFilter ? { entryDate: entryDateFilter } : {}),
        ...(searchOr ? { OR: searchOr } : {}),
      },
      orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
      take: MAX_LIMIT,
      select: {
        id: true,
        entryNo: true,
        entryDate: true,
        legalEntityCode: true,
        status: true,
        branchId: true,
        branch: { select: { code: true, name: true } },
        totalAmount: true,
      },
    })
    rows.push(
      ...pcvRows.map((row) => mapAmountVoucherRow(row, VOUCHER_INQUIRY_DOC_TYPE.PCV))
    )
  }

  const filtered = applyRowFilters(rows, filter)
  filtered.sort((a, b) => b.date.localeCompare(a.date))

  const limit = Math.min(
    Math.max(Number(filter.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  )
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)

  return {
    documents: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}
