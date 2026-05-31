import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { listReopenEvidenceByPeriodId } from "@/lib/finance/reopen-evidence"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const evidence = await listReopenEvidenceByPeriodId(prisma, id)
    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    return financeErrorResponse(
      err,
      "GET finance/periods/[id]/reopen-evidence error"
    )
  }
}
