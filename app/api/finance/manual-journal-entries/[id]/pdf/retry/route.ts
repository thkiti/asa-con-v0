import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { retryManualJournalEntryPdfAttach } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import { buildManualJournalPdfApiPayload } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params

    const existing = await prisma.manualJournalEntry.findFirst({
      where: { id, legalEntityCode },
      select: { status: true, pdfPath: true },
    })

    if (!existing) {
      throw new ManualJournalEntryError(
        "Manual journal entry not found",
        ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    if (existing.status !== "POSTED") {
      throw new ManualJournalEntryError(
        "PDF retry is only allowed for POSTED manual journal entries",
        ManualJournalEntryErrorCodes.INVALID_TRANSITION,
        409
      )
    }

    if (existing.pdfPath) {
      const fresh = await getManualJournalEntryById(prisma, id, legalEntityCode)
      return NextResponse.json({
        entry: fresh,
        ...buildManualJournalPdfApiPayload(fresh),
      })
    }

    const attachResult = await retryManualJournalEntryPdfAttach(id, legalEntityCode)
    const fresh = await getManualJournalEntryById(prisma, id, legalEntityCode)
    return NextResponse.json({
      entry: fresh,
      ...buildManualJournalPdfApiPayload(fresh, attachResult),
    })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(
      err,
      "POST manual-journal-entries/[id]/pdf/retry"
    )
  }
}
