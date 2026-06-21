import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { revenueVoucherErrorResponse } from "@/app/api/finance/revenue-vouchers/shared/revenue-voucher-api-errors"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getRevenueVoucherById } from "@/lib/finance/revenue-voucher/revenue-voucher-read"
import { postRevenueVoucher } from "@/lib/finance/revenue-voucher/revenue-voucher-post"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    await postRevenueVoucher({
      entryId: id,
      postedByStaffId: actor.staffId,
    })
    const fresh = await getRevenueVoucherById(prisma, id)
    return NextResponse.json({ entry: fresh })
  } catch (err: unknown) {
    return revenueVoucherErrorResponse(err, "POST revenue-vouchers/[id]/post")
  }
}
