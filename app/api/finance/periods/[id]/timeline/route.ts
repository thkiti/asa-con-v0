import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getPeriodAuditTimelineByPeriodId } from "@/lib/finance/period-audit-timeline"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const result = await getPeriodAuditTimelineByPeriodId(prisma, id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods/[id]/timeline error")
  }
}
