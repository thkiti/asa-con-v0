import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { paymentVoucherErrorResponse } from "@/app/api/finance/payment-vouchers/shared/payment-voucher-api-errors"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getPaymentVoucherById } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { submitPaymentVoucher } from "@/lib/finance/payment-voucher/payment-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    await submitPaymentVoucher({ entryId: id, submittedByStaffId: actor.staffId })
    const entry = await getPaymentVoucherById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return paymentVoucherErrorResponse(err, "POST payment-vouchers/[id]/submit")
  }
}
