import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { endErrorResponse } from "@/app/api/stock-document/end/shared/end-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  canViewEnd,
  getEndDocumentDetail,
  EndError,
  EndErrorCodes,
} from "@/lib/stock/end"
import {
  assertCanReadDocument,
  requireStockDocumentSession,
  resolveSessionLegalEntityCode,
} from "@/lib/stock/document-read"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const session = requireStockDocumentSession(await getSession())
    if (!canViewEnd(session.role)) {
      throw new EndError(
        "Permission denied",
        EndErrorCodes.PERMISSION_DENIED,
        403
      )
    }

    const legalEntityCode = resolveSessionLegalEntityCode(session)
    const detail = await getEndDocumentDetail(id, legalEntityCode)
    assertCanReadDocument(session, detail)
    return NextResponse.json(detail)
  } catch (err: unknown) {
    return endErrorResponse(err, "GET stock-document/end/[id] error")
  }
}
