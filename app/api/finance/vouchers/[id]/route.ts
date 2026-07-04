import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getVoucherDetailById } from "@/lib/finance/voucher-read"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const voucher = await getVoucherDetailById(prisma, id, legalEntityCode)
    return NextResponse.json({ voucher })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/vouchers/[id] error")
  }
}
