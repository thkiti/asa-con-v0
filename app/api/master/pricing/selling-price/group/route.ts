import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { setSellingPriceGroup } from "@/lib/pricing"
import { PricingDomainError } from "@/lib/pricing/pricing-errors"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const anchorProductId = String(raw.anchorProductId ?? "").trim()
    const newPrice = Number(raw.newPrice)

    if (!anchorProductId || !Number.isFinite(newPrice)) {
      throw new PricingDomainError(
        "Invalid anchorProductId or newPrice",
        "INVALID_BODY",
        400
      )
    }
    if (newPrice <= 0) {
      throw new PricingDomainError("Price must be greater than 0", "INVALID_PRICE", 400)
    }
    if (!("expectedOldPrice" in raw)) {
      throw new PricingDomainError(
        "expectedOldPrice required (null if no price)",
        "MISSING_EXPECTED_OLD_PRICE",
        400
      )
    }

    let expectedOldPrice: number | null
    if (raw.expectedOldPrice === null) {
      expectedOldPrice = null
    } else {
      const n = Number(raw.expectedOldPrice)
      if (raw.expectedOldPrice !== null && !Number.isFinite(n)) {
        throw new PricingDomainError("Invalid expectedOldPrice", "INVALID_EXPECTED", 400)
      }
      expectedOldPrice = Number.isFinite(n) ? n : null
    }

    const result = await setSellingPriceGroup(prisma, {
      anchorProductId,
      newPrice: Number(newPrice.toFixed(2)),
      expectedOldPrice,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/pricing/selling-price/group")
  }
}
