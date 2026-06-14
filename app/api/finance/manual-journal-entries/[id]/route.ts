import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import {
  parseEntryDate,
  parseManualJournalSaveLines,
} from "@/app/api/finance/manual-journal-entries/shared/parse-manual-journal-entry-body"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { updateManualJournalEntryDraft } from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"
import { deleteDraftManualJournalEntry } from "@/lib/finance/manual-journal-entry/manual-journal-entry-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const entry = await getManualJournalEntryById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(err, "GET manual-journal-entries/[id]")
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const entry = await updateManualJournalEntryDraft({
      entryId: id,
      ...(body.entryDate != null
        ? { entryDate: parseEntryDate(body.entryDate) }
        : {}),
      ...(body.description !== undefined
        ? { description: body.description != null ? String(body.description).trim() || null : null }
        : {}),
      ...(body.refNo !== undefined
        ? { refNo: body.refNo != null ? String(body.refNo).trim() || null : null }
        : {}),
      lines: parseManualJournalSaveLines(body.lines),
    })

    const detail = await getManualJournalEntryById(prisma, entry.id)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return manualJournalEntryErrorResponse(err, "PATCH manual-journal-entries/[id]")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (err instanceof Error && err.message.includes("entryDate")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return manualJournalEntryErrorResponse(err, "PATCH manual-journal-entries/[id]")
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    await deleteDraftManualJournalEntry({ entryId: id })
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(err, "DELETE manual-journal-entries/[id]")
  }
}
