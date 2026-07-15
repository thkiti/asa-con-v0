import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { invoiceVoucherErrorResponse } from "@/app/api/finance/invoice-vouchers/shared/invoice-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getInvoiceVoucherById } from "@/lib/finance/invoice-voucher/invoice-voucher-read"
import { postInvoiceVoucher } from "@/lib/finance/invoice-voucher/invoice-voucher-post"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const entry = await postInvoiceVoucher({
      entryId: id,
      legalEntityCode,
      postedByStaffId: actor.staffId,
    })
    const detail = await getInvoiceVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    return invoiceVoucherErrorResponse(err, "POST invoice-vouchers/[id]/post")
  }
}
