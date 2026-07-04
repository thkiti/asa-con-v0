import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { cancelManualJournalEntry } from "@/lib/finance/manual-journal-entry/manual-journal-entry-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as {
      cancelReason?: unknown
    }

    await cancelManualJournalEntry({
      entryId: id,
      legalEntityCode,
      cancelledByStaffId: actor.staffId,
      cancelReason:
        body.cancelReason != null ? String(body.cancelReason).trim() || null : null,
    })
    const entry = await getManualJournalEntryById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(err, "POST manual-journal-entries/[id]/cancel")
  }
}
