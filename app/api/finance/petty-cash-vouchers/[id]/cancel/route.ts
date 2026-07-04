import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { pettyCashVoucherErrorResponse } from "@/app/api/finance/petty-cash-vouchers/shared/petty-cash-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getPettyCashVoucherById } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { cancelPettyCashVoucher } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    await cancelPettyCashVoucher({
      entryId: id,
      legalEntityCode,
      cancelledByStaffId: actor.staffId,
      cancelReason:
        body.cancelReason != null ? String(body.cancelReason).trim() || null : null,
    })
    const entry = await getPettyCashVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return pettyCashVoucherErrorResponse(err, "POST petty-cash-vouchers/[id]/cancel")
  }
}
