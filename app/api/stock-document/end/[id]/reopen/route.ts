import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { endErrorResponse } from "@/app/api/stock-document/end/shared/end-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  canReopenEnd,
  reopenEndDocument,
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
    if (!canReopenEnd(session.role)) {
      throw new EndError(
        "Permission denied",
        EndErrorCodes.PERMISSION_DENIED,
        403
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      staffId?: string
      reason?: string
    }
    const staffId = String(body.staffId ?? session.staffId).trim()
    const reason = String(body.reason ?? "").trim()

    const result = await reopenEndDocument({
      documentId: id,
      staffId,
      role: session.role,
      reason,
    })
    return NextResponse.json(result.document)
  } catch (err: unknown) {
    return endErrorResponse(err, "POST stock-document/end/[id]/reopen error")
  }
}
