import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { listAccountingPeriods } from "@/lib/finance/period-list"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || undefined
    const periods = await listAccountingPeriods(prisma, { branchId })
    return NextResponse.json({ periods })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods error")
  }
}
