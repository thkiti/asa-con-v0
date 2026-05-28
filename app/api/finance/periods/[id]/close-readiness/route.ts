import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getCloseReadinessByPeriodId } from "@/lib/finance/close-readiness"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const readiness = await getCloseReadinessByPeriodId(prisma, id)
    return NextResponse.json({ readiness })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods/[id]/close-readiness error")
  }
}