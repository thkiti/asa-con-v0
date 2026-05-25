import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import {
  financeErrorResponse,
  parseAccountingPeriodStatus,
} from "@/app/api/finance/shared/finance-api-errors"
import { getSession, PeriodAdminAuthError, requirePeriodAdminActor } from "@/lib/auth"

type Context = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await context.params
    const body = (await req.json().catch(() => ({}))) as {
      nextStatus?: unknown
      reason?: unknown
    }

    const nextStatus = parseAccountingPeriodStatus(body.nextStatus)
    if (!nextStatus) {
      return NextResponse.json(
        { error: "Invalid nextStatus", code: "INVALID_STATUS" },
        { status: 400 }
      )
    }

    requirePeriodAdminActor(await getSession())

    return NextResponse.json(
      {
        error: "Period status workflow not implemented",
        code: "NOT_IMPLEMENTED",
      },
      { status: 501 }
    )
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "PATCH finance/period/[id]/status error")
  }
}
