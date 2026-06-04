import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { loadSellingPriceGroupPreview } from "@/lib/pricing"
import { PricingDomainError } from "@/lib/pricing/pricing-errors"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const productId = req.nextUrl.searchParams.get("productId")?.trim()
    if (!productId) {
      throw new PricingDomainError("productId required", "MISSING_PRODUCT_ID", 400)
    }

    const preview = await loadSellingPriceGroupPreview(prisma, productId)
    if (!preview) {
      throw new PricingDomainError("Product not found", "PRODUCT_NOT_FOUND", 404)
    }

    return NextResponse.json(preview)
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/pricing/selling-price/group/preview")
  }
}
