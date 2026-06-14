import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import {
  parseEntryDate,
  parseLegalEntityCode,
  parseManualJournalEntryType,
  parseManualJournalSaveLines,
} from "@/app/api/finance/manual-journal-entries/shared/parse-manual-journal-entry-body"
import { parseManualJournalEntryListQuery } from "@/app/api/finance/manual-journal-entries/shared/parse-manual-journal-entry-query"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { createManualJournalEntryDraft } from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"
import {
  getManualJournalEntryById,
  listManualJournalEntries,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requirePeriodAdminActor(await getSession())
    const filter = parseManualJournalEntryListQuery(req.nextUrl.searchParams)
    const result = await listManualJournalEntries(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return manualJournalEntryErrorResponse(err, "GET manual-journal-entries")
    }
    return manualJournalEntryErrorResponse(err, "GET manual-journal-entries")
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const body = (await req.json()) as Record<string, unknown>

    const branchId = String(body.branchId ?? "").trim()
    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const entry = await createManualJournalEntryDraft({
      branchId,
      legalEntityCode: parseLegalEntityCode(body.legalEntityCode),
      entryDate: parseEntryDate(body.entryDate),
      entryType: parseManualJournalEntryType(body.entryType),
      description:
        body.description != null ? String(body.description).trim() || null : null,
      refNo: body.refNo != null ? String(body.refNo).trim() || null : null,
      createdByStaffId: actor.staffId,
      lines: parseManualJournalSaveLines(body.lines),
    })

    const detail = await getManualJournalEntryById(prisma, entry.id)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return manualJournalEntryErrorResponse(err, "POST manual-journal-entries")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (
      err instanceof Error &&
      (err.message.includes("entryType") ||
        err.message.includes("legalEntityCode") ||
        err.message.includes("entryDate"))
    ) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return manualJournalEntryErrorResponse(err, "POST manual-journal-entries")
  }
}
