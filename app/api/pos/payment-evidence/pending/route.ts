import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { listPendingPaymentEvidence } from "@/lib/pos/list-pending-payment-evidence"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { prisma } from "@/lib/shared/prisma"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

export async function GET() {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = session.branchId.trim()
    if (!branchId) {
      throw new PosLookupError("Shop session requires branchId", "INVALID_BRANCH", 400)
    }

    const result = await listPendingPaymentEvidence(prisma, { branchId })
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "GET /api/pos/payment-evidence/pending")
  }
}
