import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { lookupPosProductByCode } from "@/lib/pos/product-search"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requirePosShopSession(await getSession())
    const code = String(req.nextUrl.searchParams.get("code") ?? "").trim()
    const product = await lookupPosProductByCode(prisma, code)
    return NextResponse.json({ product })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/products/lookup")
  }
}
