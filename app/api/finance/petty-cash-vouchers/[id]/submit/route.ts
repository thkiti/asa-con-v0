import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { pettyCashVoucherErrorResponse } from "@/app/api/finance/petty-cash-vouchers/shared/petty-cash-voucher-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getPettyCashVoucherById } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { submitPettyCashVoucher } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    await submitPettyCashVoucher({
      entryId: id,
      legalEntityCode,
      submittedByStaffId: actor.staffId,
    })
    const entry = await getPettyCashVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return pettyCashVoucherErrorResponse(err, "POST petty-cash-vouchers/[id]/submit")
  }
}
