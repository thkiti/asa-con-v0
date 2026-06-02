import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { deleteDraftDocument } from "@/lib/stock/document/document-workflow"

type Context = {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    await deleteDraftDocument({ documentId: id })
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return documentErrorResponse(err, "DELETE stock-document error")
  }
}
