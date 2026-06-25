import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { invoiceVoucherErrorResponse } from "@/app/api/finance/invoice-vouchers/shared/invoice-voucher-api-errors"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getInvoiceVoucherById } from "@/lib/finance/invoice-voucher/invoice-voucher-read"
import { cancelInvoiceVoucher } from "@/lib/finance/invoice-voucher/invoice-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const entry = await cancelInvoiceVoucher({
      entryId: id,
      cancelledByStaffId: actor.staffId,
      cancelReason:
        body.cancelReason != null ? String(body.cancelReason).trim() || null : null,
    })
    const detail = await getInvoiceVoucherById(prisma, entry.id)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    return invoiceVoucherErrorResponse(err, "POST invoice-vouchers/[id]/cancel")
  }
}
