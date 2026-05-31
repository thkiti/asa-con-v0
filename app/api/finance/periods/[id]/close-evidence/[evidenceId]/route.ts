import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getCloseEvidenceById } from "@/lib/finance/close-evidence"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string; evidenceId: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { evidenceId } = await context.params
    const evidence = await getCloseEvidenceById(prisma, evidenceId)
    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    return financeErrorResponse(
      err,
      "GET finance/periods/[id]/close-evidence/[evidenceId] error"
    )
  }
}
