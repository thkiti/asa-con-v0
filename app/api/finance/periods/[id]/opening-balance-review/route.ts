import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { buildOpeningBalanceReviewForPeriod } from "@/lib/finance/opening-balance-review"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const review = await buildOpeningBalanceReviewForPeriod(prisma, id)
    return NextResponse.json({ review })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods/[id]/opening-balance-review error")
  }
}
