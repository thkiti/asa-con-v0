import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { getSession } from "@/lib/auth/session"
import { getOrCreateStockCountDocument } from "@/lib/stock/document/get-or-create-stock-count"
import {
  requireStockDocumentSession,
  resolveListBranchId,
} from "@/lib/stock/document-read"

export async function POST() {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = resolveListBranchId(session, session.branchId)

    const document = await getOrCreateStockCountDocument({
      branchId,
      staffId: session.staffId,
    })

    return NextResponse.json({ id: document.id, refNo: document.refNo })
  } catch (err: unknown) {
    return documentErrorResponse(err, "POST stock-document/get-or-create error")
  }
}
