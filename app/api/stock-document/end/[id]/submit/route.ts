import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { endErrorResponse } from "@/app/api/stock-document/end/shared/end-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  canSubmitEnd,
  submitEndDocument,
  EndError,
  EndErrorCodes,
} from "@/lib/stock/end"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const session = requireStockDocumentSession(await getSession())
    if (!canSubmitEnd(session.role)) {
      throw new EndError(
        "Permission denied",
        EndErrorCodes.PERMISSION_DENIED,
        403
      )
    }

    const body = (await req.json().catch(() => ({}))) as { staffId?: string }
    const staffId = String(body.staffId ?? session.staffId).trim()

    const result = await submitEndDocument({ documentId: id, staffId })
    return NextResponse.json({
      document: result.document,
      completeness: result.completeness,
    })
  } catch (err: unknown) {
    return endErrorResponse(err, "POST stock-document/end/[id]/submit error")
  }
}
