import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { pettyCashVoucherErrorResponse } from "@/app/api/finance/petty-cash-vouchers/shared/petty-cash-voucher-api-errors"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getPettyCashVoucherById } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { submitPettyCashVoucher } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    await submitPettyCashVoucher({ entryId: id, submittedByStaffId: actor.staffId })
    const entry = await getPettyCashVoucherById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return pettyCashVoucherErrorResponse(err, "POST petty-cash-vouchers/[id]/submit")
  }
}
