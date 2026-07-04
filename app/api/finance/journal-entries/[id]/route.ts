import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getJournalInquiryById } from "@/lib/finance/journal-inquiry"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const journal = await getJournalInquiryById(prisma, id, legalEntityCode)
    return NextResponse.json({ journal })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/journal-entries/[id]")
  }
}
