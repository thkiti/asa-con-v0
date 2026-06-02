import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { cancelDocument } from "@/lib/stock/document/document-workflow"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as {
      staffId?: string
      cancelledByStaffId?: string
      cancelReason?: string | null
    }
    const cancelledByStaffId = String(
      body.cancelledByStaffId ?? body.staffId ?? ""
    ).trim()

    if (!cancelledByStaffId) {
      return NextResponse.json(
        { error: "Missing cancelledByStaffId", code: "INVALID_DOCUMENT_STATUS" },
        { status: 400 }
      )
    }

    const document = await cancelDocument({
      documentId: id,
      cancelledByStaffId,
      cancelReason: body.cancelReason ?? null,
    })

    return NextResponse.json(document)
  } catch (err: unknown) {
    return documentErrorResponse(err, "POST stock-document cancel error")
  }
}
