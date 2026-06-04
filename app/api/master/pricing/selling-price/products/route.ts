import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { listProductsWithActiveSellingPrice } from "@/lib/pricing"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    requireMasterDatabaseSession(await getSession())
    const items = await listProductsWithActiveSellingPrice(prisma)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/pricing/selling-price/products")
  }
}
