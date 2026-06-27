import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { attachManualJournalEntryPdfFromSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import { buildManualJournalPdfApiPayload } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"
import { postManualJournalEntry } from "@/lib/finance/manual-journal-entry/manual-journal-entry-post"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const { entry, pdfSnapshot } = await postManualJournalEntry({
      entryId: id,
      legalEntityCode,
      postedByStaffId: actor.staffId,
    })

    let attachResult = null
    if (pdfSnapshot && !entry.pdfPath) {
      attachResult = await attachManualJournalEntryPdfFromSnapshot(id, pdfSnapshot, {
        legalEntityCode,
      })
    }

    const fresh = await getManualJournalEntryById(prisma, id, legalEntityCode)
    return NextResponse.json({
      entry: fresh,
      ...buildManualJournalPdfApiPayload(fresh, attachResult),
    })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(err, "POST manual-journal-entries/[id]/post")
  }
}
