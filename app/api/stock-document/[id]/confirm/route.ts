import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { confirmDocument } from "@/lib/stock/document/document-workflow"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as {
      staffId?: string
      confirmedByStaffId?: string
    }
    const confirmedByStaffId = String(
      body.confirmedByStaffId ?? body.staffId ?? ""
    ).trim()

    if (!confirmedByStaffId) {
      return NextResponse.json(
        { error: "Missing confirmedByStaffId", code: "INVALID_DOCUMENT_STATUS" },
        { status: 400 }
      )
    }

    const document = await confirmDocument({
      documentId: id,
      confirmedByStaffId,
    })

    return NextResponse.json(document)
  } catch (err: unknown) {
    return documentErrorResponse(err, "POST stock-document confirm error")
  }
}
