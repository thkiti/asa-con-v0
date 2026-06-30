import type { DocStatus, Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { buildDocumentArchiveRefKey } from "@/lib/document-archive/kinds"
import { resolvePdfAvailable } from "@/lib/document-archive/resolve-pdf-available"
import type { VaultArchiveRecord } from "@/lib/document-archive/resolve-status-types"
import { stockPhaseCodeToDocumentKind } from "@/lib/document-archive/stock-archive-kind"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  deriveStockDocumentInquiryPhaseCode,
  matchesStockDocumentInquiryKindFilter,
  stockInquiryKindToWhere,
} from "./stock-document-inquiry-kind-filter"
import {
  buildStockDocumentInquiryPath,
  buildStockDocumentInquiryPrintPath,
} from "./stock-document-inquiry-links"
import type {
  StockDocumentInquiryFilter,
  StockDocumentInquiryResult,
  StockDocumentInquiryRow,
} from "./stock-document-inquiry-types"

export type {
  StockDocumentInquiryDetail,
  StockDocumentInquiryFilter,
  StockDocumentInquiryKindFilter,
  StockDocumentInquiryLineRow,
  StockDocumentInquiryPostingState,
  StockDocumentInquiryResult,
  StockDocumentInquiryRow,
} from "./stock-document-inquiry-types"

export type StockDocumentInquiryPrisma = Pick<
  PrismaClient,
  "stockDocument" | "voucher" | "documentArchiveLink"
>

const POSTED_STATUSES: readonly DocStatus[] = ["POSTED", "TRANSFERRED"]

function parseDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function normalizeLimit(limit: number | undefined): number {
  const n = Number(limit ?? 50)
  if (!Number.isFinite(n) || n < 1) return 50
  return Math.min(Math.trunc(n), 200)
}

function normalizeOffset(offset: number | undefined): number {
  const n = Number(offset ?? 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.trunc(n)
}

function isPostedStatus(status: DocStatus): boolean {
  return (POSTED_STATUSES as readonly string[]).includes(status)
}

function buildBranchWhere(branchId: string): Prisma.StockDocumentWhereInput {
  return {
    OR: [{ branchId }, { fromLocId: branchId }, { toLocId: branchId }],
  }
}

function buildInquiryWhere(
  filter: StockDocumentInquiryFilter
): Prisma.StockDocumentWhereInput {
  const and: Prisma.StockDocumentWhereInput[] = [
    { legalEntityCode: filter.legalEntityCode },
  ]

  if (filter.branchId?.trim()) {
    and.push(buildBranchWhere(filter.branchId.trim()))
  }

  const refNo = filter.refNo?.trim()
  if (refNo) {
    and.push({ refNo: { contains: refNo, mode: "insensitive" } })
  }

  if (filter.periodKey?.trim()) {
    and.push({ periodMonth: filter.periodKey.trim() })
  }

  const fromDate = parseDate(filter.dateFrom)
  if (fromDate) {
    and.push({ date: { gte: fromDate } })
  }

  const toDate = parseDate(filter.dateTo)
  if (toDate) {
    and.push({ date: { lte: toDate } })
  }

  const postingState = filter.postingState ?? "all"
  if (postingState === "posted") {
    and.push({ status: { in: [...POSTED_STATUSES] } })
  } else if (postingState === "unposted") {
    and.push({ status: { notIn: [...POSTED_STATUSES] } })
  }

  if (filter.status) {
    and.push({ status: filter.status })
  }

  const kindWhere = stockInquiryKindToWhere(
    filter.kind ?? "",
    filter.legalEntityCode,
    filter.status
  )
  if (kindWhere) {
    and.push(kindWhere)
  }

  return { AND: and }
}

type ListRow = {
  id: string
  refNo: string
  docType: Parameters<typeof deriveStockDocumentInquiryPhaseCode>[0]["docType"]
  status: DocStatus
  date: Date
  periodMonth: string | null
  branchId: string
  legalEntityCode: string
  branch: { code: string; name: string }
}

async function loadVoucherLinks(
  prisma: StockDocumentInquiryPrisma,
  documentIds: string[],
  legalEntityCode: DocumentEntityCode
): Promise<Map<string, { voucherId: string; journalEntryId: string | null }>> {
  if (documentIds.length === 0) return new Map()

  const vouchers = await prisma.voucher.findMany({
    where: {
      legalEntityCode,
      refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
      refId: { in: documentIds },
    },
    select: {
      id: true,
      refId: true,
      journalEntry: { select: { id: true } },
    },
  })

  return new Map(
    vouchers.map((row) => [
      row.refId,
      {
        voucherId: row.id,
        journalEntryId: row.journalEntry?.id ?? null,
      },
    ])
  )
}

function mapInquiryRow(
  row: ListRow,
  voucherLink: { voucherId: string; journalEntryId: string | null } | undefined,
  vaultByKey?: Map<string, VaultArchiveRecord>
): StockDocumentInquiryRow {
  const legalEntityCode = row.legalEntityCode as DocumentEntityCode
  const phaseCode = deriveStockDocumentInquiryPhaseCode({
    docType: row.docType,
    status: row.status,
    legalEntityCode,
  })
  const documentKind = stockPhaseCodeToDocumentKind(phaseCode)
  const vaultKey = buildDocumentArchiveRefKey(
    documentKind,
    row.id,
    "DOCUMENT_PDF"
  )
  const pdfAvailable = resolvePdfAvailable(
    {
      documentKind,
      documentId: row.id,
      archiveKind: "DOCUMENT_PDF",
      workflowStatus: row.status,
    },
    vaultByKey?.get(vaultKey)
  )

  return {
    id: row.id,
    legalEntityCode: row.legalEntityCode,
    documentNo: row.refNo,
    date: row.date.toISOString(),
    periodKey: row.periodMonth,
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
    phaseCode,
    status: row.status,
    posted: isPostedStatus(row.status),
    pdfAvailable,
    inquiryPath: buildStockDocumentInquiryPath(row.id),
    printPath: buildStockDocumentInquiryPrintPath(row.id),
    voucherId: voucherLink?.voucherId ?? null,
    journalEntryId: voucherLink?.journalEntryId ?? null,
  }
}

export async function listStockDocumentsForInquiry(
  prisma: StockDocumentInquiryPrisma,
  filter: StockDocumentInquiryFilter
): Promise<StockDocumentInquiryResult> {
  const where = buildInquiryWhere(filter)
  const kind = filter.kind ?? ""
  const statusFilter = filter.status

  const rows = await prisma.stockDocument.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      branch: { select: { code: true, name: true } },
    },
  })

  const refined = rows.filter((row) =>
    matchesStockDocumentInquiryKindFilter(
      kind,
      statusFilter ?? "",
      {
        docType: row.docType,
        status: row.status,
        legalEntityCode: row.legalEntityCode as DocumentEntityCode,
      }
    )
  )

  const total = refined.length
  const offset = normalizeOffset(filter.offset)
  const limit = normalizeLimit(filter.limit)
  const page = refined.slice(offset, offset + limit)

  const voucherLinks = await loadVoucherLinks(
    prisma,
    page.map((row) => row.id),
    filter.legalEntityCode
  )

  const vaultRefs = page.map((row) => {
    const phaseCode = deriveStockDocumentInquiryPhaseCode({
      docType: row.docType,
      status: row.status,
      legalEntityCode: row.legalEntityCode as DocumentEntityCode,
    })
    return {
      documentKind: stockPhaseCodeToDocumentKind(phaseCode),
      documentId: row.id,
      archiveKind: "DOCUMENT_PDF" as const,
    }
  })
  const vaultByKey =
    vaultRefs.length > 0
      ? await loadVaultArchivesForRefs(prisma, vaultRefs)
      : new Map<string, VaultArchiveRecord>()

  const documents = page.map((row) =>
    mapInquiryRow(row, voucherLinks.get(row.id), vaultByKey)
  )

  return { documents, total }
}
