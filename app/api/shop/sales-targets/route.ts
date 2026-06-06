import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import {
  parseYearMonthParams,
  shopApiErrorResponse,
} from "@/app/api/shop/shared/shop-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  requireSalesTargetEditSession,
  requireSalesTargetViewSession,
} from "@/lib/permissions/sales-targets"
import {
  getBranchSalesTarget,
  upsertBranchSalesTarget,
} from "@/lib/shop"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireSalesTargetViewSession(await getSession())
    const { branchId, year, month } = parseYearMonthParams(req.nextUrl.searchParams)
    const target = await getBranchSalesTarget(prisma, { branchId, year, month })
    return NextResponse.json(target)
  } catch (err: unknown) {
    return shopApiErrorResponse(err, "GET /api/shop/sales-targets")
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireSalesTargetEditSession(await getSession())
    const body = (await req.json()) as Record<string, unknown>
    const branchId = String(body.branchId ?? "").trim()
    const year = Number(body.year)
    const month = Number(body.month)
    const target = await upsertBranchSalesTarget(prisma, {
      branchId,
      year,
      month,
      monthlyTotal: body.monthlyTotal,
      weekPattern: body.weekPattern,
    })
    return NextResponse.json(target)
  } catch (err: unknown) {
    return shopApiErrorResponse(err, "PUT /api/shop/sales-targets")
  }
}
