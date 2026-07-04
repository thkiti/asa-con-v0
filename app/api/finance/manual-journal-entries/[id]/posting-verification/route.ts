import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getManualJournalEntryPostingVerification } from "@/lib/finance/manual-journal-entry/manual-journal-entry-posting-verification"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const verification = await getManualJournalEntryPostingVerification(
      prisma,
      id,
      legalEntityCode
    )
    return NextResponse.json({ verification })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(
      err,
      "GET manual-journal-entries/[id]/posting-verification"
    )
  }
}
