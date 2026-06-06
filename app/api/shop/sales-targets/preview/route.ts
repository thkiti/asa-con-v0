import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { shopApiErrorResponse } from "@/app/api/shop/shared/shop-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireSalesTargetViewSession } from "@/lib/permissions/sales-targets"
import { previewDailyTargets } from "@/lib/shop"
import { SalesTargetError } from "@/lib/shop/sales-target-errors"

export async function GET(req: NextRequest) {
  try {
    requireSalesTargetViewSession(await getSession())
    const params = req.nextUrl.searchParams
    const year = Number(params.get("year") ?? "")
    const month = Number(params.get("month") ?? "")
    const monthlyTotal = params.get("monthlyTotal") ?? "0"
    const weekPatternRaw = params.get("weekPattern")

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      throw new SalesTargetError(
        "year and month are required",
        "INVALID_QUERY",
        400
      )
    }

    let weekPattern: unknown = undefined
    if (weekPatternRaw) {
      try {
        weekPattern = JSON.parse(weekPatternRaw)
      } catch {
        throw new SalesTargetError(
          "weekPattern must be valid JSON array",
          "INVALID_WEEK_PATTERN",
          400
        )
      }
    }

    const preview = previewDailyTargets({
      monthlyTotal,
      weekPattern,
      year,
      month,
    })
    return NextResponse.json(preview)
  } catch (err: unknown) {
    return shopApiErrorResponse(err, "GET /api/shop/sales-targets/preview")
  }
}
