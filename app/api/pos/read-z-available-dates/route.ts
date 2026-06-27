import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  listReadZAvailableBangkokDates,
  readZAvailableDatesRange,
} from "@/lib/pos/read-z-available-dates"
import { bangkokCalendarYmd } from "@/lib/pos/bangkokDayBounds"
import { requirePosReportContext } from "@/lib/pos/pos-report-context"
import { prisma } from "@/lib/shared/prisma"

/** Bangkok dates with sale/refund activity — for HO READ Z date dropdown. */
export async function GET() {
  try {
    const ctx = requirePosReportContext(await getSession())
    const today = bangkokCalendarYmd(new Date())
    const { fromYmd, toYmd } = readZAvailableDatesRange(today)
    const dates = await listReadZAvailableBangkokDates(
      prisma,
      ctx.branchId,
      fromYmd,
      toYmd
    )

    return NextResponse.json({ ok: true, dates, fromYmd, toYmd })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/read-z-available-dates")
  }
}
