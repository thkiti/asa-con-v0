import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getReconciliationSnapshotById } from "@/lib/finance/reconciliation-snapshot"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const snapshot = await getReconciliationSnapshotById(prisma, id)
    return NextResponse.json({ snapshot })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/reconciliation/snapshots/[id] error")
  }
}
