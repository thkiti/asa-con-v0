import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getPeriodAuditExportByPeriodId } from "@/lib/finance/period-audit-export"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const exportBundle = await getPeriodAuditExportByPeriodId(prisma, id)
    return NextResponse.json({ export: exportBundle })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods/[id]/audit-export error")
  }
}
