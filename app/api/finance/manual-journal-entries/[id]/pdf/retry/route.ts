import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { PeriodAdminAuthError } from "@/lib/auth"
import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { retryManualJournalEntryPdfAttach } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import { regenerateManualJournalEntryArchivedPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair"
import { buildManualJournalPdfApiPayload } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

function hasArchivedPdfMetadata(entry: {
  pdfPath: string | null
  pdfBlobUrl?: string | null
}): boolean {
  return (
    Boolean(String(entry.pdfPath ?? "").trim()) ||
    Boolean(String(entry.pdfBlobUrl ?? "").trim())
  )
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params

    const existing = await prisma.manualJournalEntry.findFirst({
      where: { id, legalEntityCode },
      select: { status: true, pdfPath: true, pdfBlobUrl: true },
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

    if (hasArchivedPdfMetadata(existing)) {
      if (actor.role !== "HO_ADMIN") {
        throw new PeriodAdminAuthError(
          "Replacing an archived PDF requires HO_ADMIN",
          "FORBIDDEN",
          403
        )
      }

      const repairResult = await regenerateManualJournalEntryArchivedPdf(
        id,
        legalEntityCode
      )
      const fresh = await getManualJournalEntryById(prisma, id, legalEntityCode)
      return NextResponse.json({
        entry: fresh,
        ...buildManualJournalPdfApiPayload(
          fresh,
          repairResult.ok ? { ok: true } : repairResult
        ),
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
