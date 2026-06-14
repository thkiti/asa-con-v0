import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { manualJournalEntryErrorResponse } from "@/app/api/finance/manual-journal-entries/shared/manual-journal-entry-api-errors"
import {
  getSession,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { postManualJournalEntry } from "@/lib/finance/manual-journal-entry/manual-journal-entry-post"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: Context) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    await postManualJournalEntry({
      entryId: id,
      postedByStaffId: actor.staffId,
    })
    const entry = await getManualJournalEntryById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return manualJournalEntryErrorResponse(err, "POST manual-journal-entries/[id]/post")
  }
}
