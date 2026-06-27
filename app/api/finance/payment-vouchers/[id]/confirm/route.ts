import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { paymentVoucherErrorResponse } from "@/app/api/finance/payment-vouchers/shared/payment-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getPaymentVoucherById } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { confirmPaymentVoucher } from "@/lib/finance/payment-voucher/payment-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    await confirmPaymentVoucher({
      entryId: id,
      legalEntityCode,
      confirmedByStaffId: actor.staffId,
    })
    const entry = await getPaymentVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return paymentVoucherErrorResponse(err, "POST payment-vouchers/[id]/confirm")
  }
}
