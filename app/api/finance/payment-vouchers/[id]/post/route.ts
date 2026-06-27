import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { paymentVoucherErrorResponse } from "@/app/api/finance/payment-vouchers/shared/payment-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getPaymentVoucherById } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { postPaymentVoucher } from "@/lib/finance/payment-voucher/payment-voucher-post"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    await postPaymentVoucher({
      entryId: id,
      legalEntityCode,
      postedByStaffId: actor.staffId,
    })

    const fresh = await getPaymentVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry: fresh })
  } catch (err: unknown) {
    return paymentVoucherErrorResponse(err, "POST payment-vouchers/[id]/post")
  }
}
