import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { endErrorResponse } from "@/app/api/stock-document/end/shared/end-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  canImportEnd,
  importEndCsv,
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
    if (!canImportEnd(session.role)) {
      throw new EndError(
        "Permission denied",
        EndErrorCodes.PERMISSION_DENIED,
        403
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      staffId?: string
      csvText?: string
      mode?: "preview" | "apply"
      fileName?: string
    }

    const staffId = String(body.staffId ?? session.staffId).trim()
    const csvText = String(body.csvText ?? "")
    const mode = body.mode === "apply" ? "apply" : "preview"
    const fileName = body.fileName

    if (!csvText.trim()) {
      throw new EndError("csvText is required", EndErrorCodes.INVALID_INPUT)
    }

    const result = await importEndCsv({
      documentId: id,
      staffId,
      csvText,
      mode,
      fileName,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return endErrorResponse(err, "POST stock-document/end/[id]/import error")
  }
}
