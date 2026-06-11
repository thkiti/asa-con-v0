import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { postClosingEntry } from "@/lib/finance/closing-entry-post"
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

export async function POST(_req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const period = await loadPeriodOrThrow(id)

    const result = await prisma.$transaction((tx) =>
      postClosingEntry(tx, {
        periodId: period.id,
        branchId: period.branchId,
        periodKey: period.periodKey,
      })
    )

    return NextResponse.json({ posted: result })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "POST finance/periods/[id]/closing-entry")
  }
}
