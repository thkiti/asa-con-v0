import type { ReadReportPayload } from "@/lib/pos/read-report-types"

export type CollectorLookupArchiveStatus = "ready" | "pending" | "failed" | "legacy"

export type CollectorLookupRow = {
  collectorReportId: string
  collectNo: string
  issuedAt: string
  branchId: string
  branchCode: string
  branchName: string
  branchPhone: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  report: ReadReportPayload
  archiveStatus: CollectorLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfUrl: string | null
}

export type CollectorLookupResult = {
  collectors: CollectorLookupRow[]
}

export type SearchCollectorLookupInput = {
  branchId: string
  collectNo?: string
  limit?: number
}
