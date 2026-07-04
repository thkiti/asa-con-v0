import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { loadJournalEntryWithLines } from "@/lib/finance/journal-lineage"
import { postJournalReversal } from "@/lib/finance/posting"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as {
      reversalDate?: unknown
      reason?: unknown
    }

    const reason = String(body.reason ?? "").trim()
    const reversalDateRaw = String(body.reversalDate ?? "").trim()

    if (!reason) {
      return NextResponse.json(
        { error: "Reversal reason is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!reversalDateRaw) {
      return NextResponse.json(
        { error: "reversalDate is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const reversalDate = new Date(reversalDateRaw)
    if (Number.isNaN(reversalDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid reversalDate", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    await loadJournalEntryWithLines(prisma, id, legalEntityCode)

    const result = await prisma.$transaction((tx) =>
      postJournalReversal({
        tx,
        journalEntryId: id,
        reversalDate,
        reason,
      })
    )

    return NextResponse.json({ posted: result })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "POST /api/finance/journal-entries/[id]/reverse")
  }
}
