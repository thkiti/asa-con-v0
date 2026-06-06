import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import {
  parseDashboardParams,
  shopApiErrorResponse,
} from "@/app/api/shop/shared/shop-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireSalesDashboardSession } from "@/lib/permissions/sales-dashboard"
import { buildSalesDashboardView } from "@/lib/shop/sales-dashboard"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireSalesDashboardSession(await getSession())
    const params = parseDashboardParams(req.nextUrl.searchParams)
    const view = await buildSalesDashboardView(prisma, params)
    return NextResponse.json(view)
  } catch (err: unknown) {
    return shopApiErrorResponse(err, "GET /api/shop/sales-dashboard")
  }
}
