import type { Prisma } from "@/generated/prisma/client"
import {
  buildCollectorLookupPdfUrl,
  resolveCollectorLookupArchiveStatus,
} from "@/lib/pos/collector-lookup-archive-status"
import type {
  CollectorLookupResult,
  CollectorLookupRow,
  SearchCollectorLookupInput,
} from "@/lib/pos/collector-lookup-types"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { COMPANY_TAX_BRANCH_CODE, loadCompanyTaxId } from "@/lib/thermal/company-tax"

export const COLLECTOR_LOOKUP_DEFAULT_LIMIT = 50
export const COLLECTOR_LOOKUP_MAX_LIMIT = 200

type SearchCollectorLookupDb = Pick<Prisma.TransactionClient, "collectorReport" | "branch">

function normalizeLimit(limit: number | undefined): number {
  const n = Number(limit ?? COLLECTOR_LOOKUP_DEFAULT_LIMIT)
  if (!Number.isFinite(n) || n < 1) return COLLECTOR_LOOKUP_DEFAULT_LIMIT
  return Math.min(Math.trunc(n), COLLECTOR_LOOKUP_MAX_LIMIT)
}

function parseCollectorReportJson(value: unknown): ReadReportPayload | null {
  if (!value || typeof value !== "object") return null
  const report = value as ReadReportPayload
  if (report.mode !== "COLLECT") return null
  return report
}

function mapCollectorRow(
  row: {
    id: string
    collectNo: string
    createdAt: Date
    branchId: string
    reportJson: unknown
    branch: {
      code: string
      name: string
      phone: string | null
      taxId: string | null
    }
  },
  companyTaxId: string | null
): CollectorLookupRow | null {
  const report = parseCollectorReportJson(row.reportJson)
  if (!report) return null

  const branchCode = row.branch.code
  const machineRaw = row.branch.taxId?.trim() || null
  const machineTaxId =
    branchCode === COMPANY_TAX_BRANCH_CODE ? null : machineRaw
  const archive = resolveCollectorLookupArchiveStatus()

  return {
    collectorReportId: row.id,
    collectNo: row.collectNo,
    issuedAt: row.createdAt.toISOString(),
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
    branchPhone: row.branch.phone?.trim() || null,
    companyTaxId,
    machineTaxId,
    report: { ...report, collectNo: row.collectNo },
    archiveStatus: archive.archiveStatus,
    archiveStatusLabel: archive.archiveStatusLabel,
    archiveError: archive.archiveError,
    pdfUrl: archive.pdfReady ? buildCollectorLookupPdfUrl(row.id) : null,
  }
}

export async function searchCollectorLookup(
  db: SearchCollectorLookupDb,
  input: SearchCollectorLookupInput
): Promise<CollectorLookupResult> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    return { collectors: [] }
  }

  const collectNo = input.collectNo?.trim() ?? ""
  const limit = normalizeLimit(input.limit)

  const rows = await db.collectorReport.findMany({
    where: {
      branchId,
      ...(collectNo
        ? { collectNo: { contains: collectNo, mode: "insensitive" as const } }
        : {}),
    },
    include: {
      branch: {
        select: {
          code: true,
          name: true,
          phone: true,
          taxId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  const companyTaxId = await loadCompanyTaxId(db)

  const collectors: CollectorLookupRow[] = []
  for (const row of rows) {
    const mapped = mapCollectorRow(row, companyTaxId)
    if (mapped) collectors.push(mapped)
  }

  return { collectors }
}
