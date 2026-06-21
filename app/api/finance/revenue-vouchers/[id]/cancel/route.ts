import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { revenueVoucherErrorResponse } from "@/app/api/finance/revenue-vouchers/shared/revenue-voucher-api-errors"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getRevenueVoucherById } from "@/lib/finance/revenue-voucher/revenue-voucher-read"
import { cancelRevenueVoucher } from "@/lib/finance/revenue-voucher/revenue-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    await cancelRevenueVoucher({
      entryId: id,
      cancelledByStaffId: actor.staffId,
      cancelReason:
        body.cancelReason != null ? String(body.cancelReason).trim() || null : null,
    })
    const entry = await getRevenueVoucherById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return revenueVoucherErrorResponse(err, "POST revenue-vouchers/[id]/cancel")
  }
}
