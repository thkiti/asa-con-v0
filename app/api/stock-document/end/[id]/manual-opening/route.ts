import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { endErrorResponse } from "@/app/api/stock-document/end/shared/end-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  applyEndManualOpeningLines,
  canImportEnd,
  EndError,
  EndErrorCodes,
} from "@/lib/stock/end"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

type Context = {
  params: Promise<{ id: string }>
}

/**
 * Manual paper entry of first-period BEGIN (+ optional COUNT).
 * Same validation/apply path as CSV import.
 */
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
      lines?: Array<{
        productCode?: string
        beginQty?: number
        countQty?: number | null
      }>
    }

    const staffId = String(body.staffId ?? session.staffId).trim()
    const lines = Array.isArray(body.lines) ? body.lines : []

    const result = await applyEndManualOpeningLines({
      documentId: id,
      staffId,
      lines: lines.map((line) => ({
        productCode: String(line.productCode ?? ""),
        beginQty: Number(line.beginQty),
        countQty:
          line.countQty === undefined || line.countQty === null
            ? null
            : Number(line.countQty),
      })),
      importMeta: { source: "manual" },
    })

    if (!result.valid) {
      return NextResponse.json(
        {
          error: "Opening line validation failed",
          code: EndErrorCodes.IMPORT_VALIDATION_FAILED,
          errors: result.errors,
          rows: result.rows,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      rowCount: result.rows.length,
      rows: result.rows,
      documentId: result.document?.id ?? id,
    })
  } catch (err: unknown) {
    return endErrorResponse(
      err,
      "POST stock-document/end/[id]/manual-opening error"
    )
  }
}
