import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { searchRefundableReceipts } from "@/lib/pos/search-refundable-receipts"
import { RefundError } from "@/lib/pos/refund-errors"
import { prisma } from "@/lib/shared/prisma"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"

export async function GET(req: NextRequest) {
  try {
    const session = requirePosShopSession(await getSession())
    const branchId = session.branchId.trim()
    if (!branchId) {
      throw new RefundError("Shop session requires branchId", "MISSING_BRANCH", 400)
    }

    const query = req.nextUrl.searchParams.get("query")
    const receipts = await searchRefundableReceipts(prisma, { branchId, query })

    return NextResponse.json({ receipts })
  } catch (err: unknown) {
    if (err instanceof RefundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "GET /api/pos/refund/receipts")
  }
}
