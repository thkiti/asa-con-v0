import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireStockDocumentSession } from "@/lib/stock/document-read"
import { buildStockInputList } from "@/lib/products/stock-input-list"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    requireStockDocumentSession(await getSession())
    const rows = await buildStockInputList(prisma)
    return NextResponse.json(rows)
  } catch (err: unknown) {
    return documentErrorResponse(err, "GET stock-document/input-list error")
  }
}
