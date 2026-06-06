import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { shopApiErrorResponse } from "@/app/api/shop/shared/shop-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireSalesTargetViewSession } from "@/lib/permissions/sales-targets"
import { listActiveShopBranches } from "@/lib/shop"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    requireSalesTargetViewSession(await getSession())
    const branches = await listActiveShopBranches(prisma)
    return NextResponse.json({ branches })
  } catch (err: unknown) {
    return shopApiErrorResponse(err, "GET /api/shop/sales-targets/branches")
  }
}
