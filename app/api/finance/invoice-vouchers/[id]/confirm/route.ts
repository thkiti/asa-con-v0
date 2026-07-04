import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { invoiceVoucherErrorResponse } from "@/app/api/finance/invoice-vouchers/shared/invoice-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getInvoiceVoucherById } from "@/lib/finance/invoice-voucher/invoice-voucher-read"
import { confirmInvoiceVoucher } from "@/lib/finance/invoice-voucher/invoice-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    await confirmInvoiceVoucher({
      entryId: id,
      legalEntityCode,
      confirmedByStaffId: actor.staffId,
    })
    const detail = await getInvoiceVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    return invoiceVoucherErrorResponse(err, "POST invoice-vouchers/[id]/confirm")
  }
}
