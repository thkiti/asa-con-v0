import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import {
  parseDayDetailParams,
  shopApiErrorResponse,
} from "@/app/api/shop/shared/shop-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireSalesDashboardSession } from "@/lib/permissions/sales-dashboard"
import { getSalesDashboardDayDetail } from "@/lib/shop/sales-dashboard"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireSalesDashboardSession(await getSession())
    const params = parseDayDetailParams(req.nextUrl.searchParams)
    const detail = await getSalesDashboardDayDetail(prisma, params)
    return NextResponse.json(detail)
  } catch (err: unknown) {
    return shopApiErrorResponse(err, "GET /api/shop/sales-dashboard/day")
  }
}
