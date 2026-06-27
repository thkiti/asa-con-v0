import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { paymentVoucherErrorResponse } from "@/app/api/finance/payment-vouchers/shared/payment-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getPaymentVoucherById } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { cancelPaymentVoucher } from "@/lib/finance/payment-voucher/payment-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    await cancelPaymentVoucher({
      entryId: id,
      legalEntityCode,
      cancelledByStaffId: actor.staffId,
      cancelReason:
        body.cancelReason != null ? String(body.cancelReason).trim() || null : null,
    })
    const entry = await getPaymentVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return paymentVoucherErrorResponse(err, "POST payment-vouchers/[id]/cancel")
  }
}
