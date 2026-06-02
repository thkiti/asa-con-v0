import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { parseSaveBody } from "@/app/api/stock-document/shared/parse-save-body"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { saveDocument } from "@/lib/stock/document/document-save"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = parseSaveBody(body)

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const document = await saveDocument({
      id: parsed.id,
      docType: parsed.docType,
      date: parsed.date,
      branchId: parsed.branchId,
      fromLocId: parsed.fromLocId,
      toLocId: parsed.toLocId,
      createdByStaffId: parsed.createdByStaffId,
      lines: parsed.lines,
    })

    return NextResponse.json(document)
  } catch (err: unknown) {
    return documentErrorResponse(err, "POST stock-document error")
  }
}
