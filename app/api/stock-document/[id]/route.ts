import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { getSession } from "@/lib/auth/session"
import { deleteDraftDocument } from "@/lib/stock/document/document-workflow"
import {
  getStockDocumentDetail,
  requireStockDocumentSession,
} from "@/lib/stock/document-read"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const session = requireStockDocumentSession(await getSession())
    const document = await getStockDocumentDetail(prisma, session, id)
    return NextResponse.json(document)
  } catch (err: unknown) {
    return documentErrorResponse(err, "GET stock-document/[id] error")
  }
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
