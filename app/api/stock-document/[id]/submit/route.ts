import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { submitDocument } from "@/lib/stock/document/document-workflow"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const document = await submitDocument({ documentId: id })
    return NextResponse.json(document)
  } catch (err: unknown) {
    return documentErrorResponse(err, "POST stock-document submit error")
  }
}
