import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { parseSaveBody } from "@/app/api/stock-document/shared/parse-save-body"
import { parseListQuery } from "@/app/api/stock-document/shared/parse-list-query"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { getSession } from "@/lib/auth/session"
import { saveDocument } from "@/lib/stock/document/document-save"
import {
  listStockDocuments,
  requireStockDocumentSession,
} from "@/lib/stock/document-read"
import { resolveStockDocumentListScope } from "@/lib/stock/document-read/resolve-stock-document-list-scope"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
} from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const parsed = parseListQuery(req.url)
    const scope = await resolveStockDocumentListScope(prisma, session, {
      branchId: parsed.branchId,
      ...(parsed.docType ? { docType: parsed.docType } : {}),
    })

    const result = await listStockDocuments(prisma, {
      entityWhere: scope.entityWhere,
      legalEntityCode: scope.legalEntityCode,
      branchId: scope.branchId,
      limit: parsed.limit,
      cursor: parsed.cursor,
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(parsed.periodMonth ? { periodMonth: parsed.periodMonth } : {}),
      ...(parsed.fromDate ? { fromDate: parsed.fromDate } : {}),
      ...(parsed.toDate ? { toDate: parsed.toDate } : {}),
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return documentErrorResponse(err, "GET stock-document error")
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const body = await req.json().catch(() => ({}))
    const parsed = parseSaveBody(body)

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const legalEntityCode =
      parseDocumentEntityCode(session.documentEntityCode) ??
      DEFAULT_DOCUMENT_ENTITY_CODE

    const document = await saveDocument({
      id: parsed.id,
      docType: parsed.docType,
      date: parsed.date,
      branchId: parsed.branchId,
      fromLocId: parsed.fromLocId,
      toLocId: parsed.toLocId,
      createdByStaffId: parsed.createdByStaffId ?? session.staffId,
      legalEntityCode,
      lines: parsed.lines,
    })

    return NextResponse.json(document)
  } catch (err: unknown) {
    return documentErrorResponse(err, "POST stock-document error")
  }
}
