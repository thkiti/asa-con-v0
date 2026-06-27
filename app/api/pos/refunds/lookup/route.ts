import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { searchRefundLookup } from "@/lib/pos/refund-lookup"
import { prisma } from "@/lib/shared/prisma"
import {
  requireStockDocumentSession,
  resolveListBranchId,
} from "@/lib/stock/document-read/document-access"

export async function GET(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = resolveListBranchId(
      session,
      req.nextUrl.searchParams.get("branchId")
    )

    const result = await searchRefundLookup(prisma, {
      branchId,
      refundNo: req.nextUrl.searchParams.get("refundNo"),
      limit: Number(req.nextUrl.searchParams.get("limit") ?? NaN) || undefined,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/refunds/lookup")
  }
}
