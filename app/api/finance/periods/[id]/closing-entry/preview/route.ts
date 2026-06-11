import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { previewClosingEntry } from "@/lib/finance/closing-entry-post"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

async function loadPeriodOrThrow(periodId: string) {
  const period = await prisma.accountingPeriod.findUnique({
    where: { id: periodId.trim() },
  })
  if (!period) {
    throw new FinancePostingError(
      `Accounting period not found: ${periodId}`,
      "PERIOD_NOT_FOUND"
    )
  }
  return period
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const period = await loadPeriodOrThrow(id)
    const preview = await previewClosingEntry(prisma, {
      periodId: period.id,
      branchId: period.branchId,
      periodKey: period.periodKey,
    })
    return NextResponse.json({ preview })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods/[id]/closing-entry/preview")
  }
}
