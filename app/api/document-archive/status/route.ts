import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { documentArchiveApiErrorResponse } from "@/app/api/document-archive/shared/document-archive-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getDocumentArchiveStatus } from "@/lib/document-archive/get-archive-status"
import {
  parseArchiveRequirementPolicy,
  parseDocumentArchiveKind,
  parseDocumentKind,
} from "@/lib/document-archive/validation"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)

    const params = req.nextUrl.searchParams
    const documentKind = parseDocumentKind(params.get("documentKind"))
    const documentId = String(params.get("documentId") ?? "").trim()
    const archiveKind = parseDocumentArchiveKind(
      params.get("archiveKind") ?? "DOCUMENT_PDF"
    )
    const documentNo = String(params.get("documentNo") ?? "").trim() || undefined
    const workflowStatus =
      String(params.get("workflowStatus") ?? params.get("status") ?? "").trim() ||
      undefined
    const requiredPolicy = parseArchiveRequirementPolicy(params.get("requiredPolicy"))

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const status = await getDocumentArchiveStatus(prisma, {
      documentKind,
      documentId,
      documentNo,
      archiveKind,
      workflowStatus,
      requiredPolicy,
    }, { legalEntityCode })

    return NextResponse.json(status)
  } catch (err: unknown) {
    return documentArchiveApiErrorResponse(err, "GET /api/document-archive/status")
  }
}
