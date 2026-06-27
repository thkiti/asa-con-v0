import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { readStoredManualJournalPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

function safePdfFileName(entryNo: string, entryId: string): string {
  const base = String(entryNo || entryId).replace(/[^\w.-]+/g, "_")
  return `${base}.pdf`
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params

    const entry = await prisma.manualJournalEntry.findFirst({
      where: { id, legalEntityCode },
      select: { status: true, pdfPath: true, pdfBlobUrl: true, entryNo: true },
    })

    if (!entry) {
      throw new ManualJournalEntryError(
        "Manual journal entry not found",
        ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    if (entry.status !== "POSTED") {
      return NextResponse.json(
        {
          error: "PDF is only available for posted manual journal entries",
          code: "PDF_NOT_AVAILABLE",
        },
        { status: 404 }
      )
    }

    if (!entry.pdfPath) {
      return NextResponse.json(
        {
          error: "PDF snapshot is not available yet",
          code: "PDF_PENDING",
        },
        { status: 404 }
      )
    }

    const dispositionParam = req.nextUrl.searchParams.get("disposition")
    const disposition =
      dispositionParam === "attachment" ? "attachment" : "inline"
    const buffer = await readStoredManualJournalPdf({
      pdfPath: entry.pdfPath,
      pdfBlobUrl: entry.pdfBlobUrl,
    })
    const fileName = safePdfFileName(entry.entryNo, id)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(err, "GET manual-journal-entries/[id]/pdf")
  }
}
