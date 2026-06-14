import { NextResponse } from "next/server"
import {
  mapManualJournalEntryRouteError,
  manualJournalEntryRouteErrorMessage,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-route-errors"

export function manualJournalEntryErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapManualJournalEntryRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = manualJournalEntryRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
