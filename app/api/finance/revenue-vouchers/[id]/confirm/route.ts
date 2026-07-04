import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { revenueVoucherErrorResponse } from "@/app/api/finance/revenue-vouchers/shared/revenue-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getRevenueVoucherById } from "@/lib/finance/revenue-voucher/revenue-voucher-read"
import { confirmRevenueVoucher } from "@/lib/finance/revenue-voucher/revenue-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    await confirmRevenueVoucher({
      entryId: id,
      legalEntityCode,
      confirmedByStaffId: actor.staffId,
    })
    const entry = await getRevenueVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return revenueVoucherErrorResponse(err, "POST revenue-vouchers/[id]/confirm")
  }
}
