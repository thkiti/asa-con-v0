import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { buildPosTargetVsSalesSummary } from "@/lib/pos/target-vs-sales"
import { prisma } from "@/lib/shared/prisma"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"

export async function GET(req: NextRequest) {
  try {
    const session = requirePosShopSession(await getSession())
    const branchId = session.branchId.trim()
    if (!branchId) {
      return NextResponse.json(
        { error: "Shop session requires branchId", code: "MISSING_BRANCH" },
        { status: 400 }
      )
    }

    // POS-safe: always session branch — ignore client branchId query.
    void req.nextUrl.searchParams.get("branchId")

    const summary = await buildPosTargetVsSalesSummary(prisma, { branchId })
    return NextResponse.json(summary)
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/target-vs-sales")
  }
}
