import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { endErrorResponse } from "@/app/api/stock-document/end/shared/end-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  canViewEnd,
  getOrCreateEndDocument,
  EndError,
  EndErrorCodes,
} from "@/lib/stock/end"
import { requireStockDocumentSession } from "@/lib/stock/document-read"
import { resolveEndGetOrCreateBranch } from "@/lib/stock/document-read/resolve-stock-document-list-scope"
import { DocumentError } from "@/lib/stock/document/document-errors"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    if (!canViewEnd(session.role)) {
      throw new EndError(
        "Permission denied",
        EndErrorCodes.PERMISSION_DENIED,
        403
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      legalEntityCode?: string
      branchId?: string
      periodMonth?: string
      staffId?: string
    }

    const periodMonth = String(body.periodMonth ?? "").trim()
    const staffId = String(body.staffId ?? session.staffId).trim()

    if (!periodMonth) {
      throw new EndError("periodMonth is required", EndErrorCodes.INVALID_INPUT)
    }

    let legalEntityCode: string
    let branchId: string
    try {
      const resolved = await resolveEndGetOrCreateBranch(prisma, session, {
        legalEntityCode: body.legalEntityCode,
        branchId: body.branchId,
      })
      legalEntityCode = resolved.legalEntityCode
      branchId = resolved.branchId
    } catch (err: unknown) {
      if (err instanceof DocumentError) {
        throw new EndError(err.message, EndErrorCodes.INVALID_INPUT, err.httpStatus)
      }
      throw err
    }

    const result = await getOrCreateEndDocument({
      legalEntityCode,
      branchId,
      periodMonth,
      staffId,
    })

    return NextResponse.json({
      id: result.document.id,
      refNo: result.document.refNo,
      created: result.created,
      endStatus: result.document.endStatus,
      periodMonth: result.document.periodMonth,
    })
  } catch (err: unknown) {
    return endErrorResponse(err, "POST stock-document/end/get-or-create error")
  }
}
