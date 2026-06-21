import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { pettyCashVoucherErrorResponse } from "@/app/api/finance/petty-cash-vouchers/shared/petty-cash-voucher-api-errors"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getPettyCashVoucherById } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { cancelPettyCashVoucher } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    await cancelPettyCashVoucher({
      entryId: id,
      cancelledByStaffId: actor.staffId,
      cancelReason:
        body.cancelReason != null ? String(body.cancelReason).trim() || null : null,
    })
    const entry = await getPettyCashVoucherById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return pettyCashVoucherErrorResponse(err, "POST petty-cash-vouchers/[id]/cancel")
  }
}
