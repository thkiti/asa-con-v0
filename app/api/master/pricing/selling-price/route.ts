import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  listSellingPriceHistory,
  parseSetSellingPriceBody,
  setSellingPrice,
} from "@/lib/pricing"
import { getActiveSellingPrice } from "@/lib/pricing/selling-price"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const productId = req.nextUrl.searchParams.get("productId")?.trim()
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }

    const active = await getActiveSellingPrice(prisma, productId)
    const history = await listSellingPriceHistory(prisma, productId)

    return NextResponse.json({
      activePrice: active?.toString() ?? null,
      history,
    })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/pricing/selling-price")
  }
}

export async function POST(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const body = parseSetSellingPriceBody(await req.json())
    const item = await setSellingPrice(prisma, body)
    return NextResponse.json({ item })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/pricing/selling-price")
  }
}
