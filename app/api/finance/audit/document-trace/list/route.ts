import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  DOCUMENT_TRACE_DOC_TYPES,
  type DocumentTraceDocType,
} from "@/lib/finance/audit/document-trace-filters"
import { listDocumentTraceDocuments } from "@/lib/finance/audit/document-trace-list"
import {
  parseDocumentTraceListLimit,
  parseDocumentTraceListOffset,
} from "@/lib/finance/audit/document-trace-list-pagination"
import { prisma } from "@/lib/shared/prisma"

function parseDocType(raw: string | null): DocumentTraceDocType | null {
  const value = raw?.trim().toUpperCase() ?? ""
  if (!value) return null
  if (!(DOCUMENT_TRACE_DOC_TYPES as readonly string[]).includes(value)) {
    return null
  }
  return value as DocumentTraceDocType
}

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const params = req.nextUrl.searchParams
    const docType = parseDocType(params.get("docType"))

    if (!docType) {
      return NextResponse.json(
        { rows: [], warnings: ["docType is required."] },
        { status: 400 }
      )
    }

    const result = await listDocumentTraceDocuments(prisma, {
      legalEntityCode,
      docType,
      period: params.get("period") ?? "",
      branchCode: params.get("branchCode") ?? params.get("branch") ?? undefined,
      dateFrom: params.get("dateFrom") ?? params.get("from") ?? undefined,
      dateTo: params.get("dateTo") ?? params.get("to") ?? undefined,
      limit: parseDocumentTraceListLimit(params.get("limit")),
      offset: parseDocumentTraceListOffset(params.get("offset")),
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/audit/document-trace/list error")
  }
}
