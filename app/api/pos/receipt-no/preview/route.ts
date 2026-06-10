import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { CheckoutError } from "@/lib/pos/checkout-errors"
import { previewNextReceiptNo } from "@/lib/pos/receipt"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    const session = requirePosShopSession(await getSession())
    const branchId = session.branchId.trim()
    if (!branchId) {
      throw new CheckoutError("Shop session requires branchId", "INVALID_BRANCH", 400)
    }

    const receiptNo = await previewNextReceiptNo(prisma, branchId)
    return NextResponse.json({ receiptNo, preview: true })
  } catch (err: unknown) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "GET /api/pos/receipt-no/preview")
  }
}
