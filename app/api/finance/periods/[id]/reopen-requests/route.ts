import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
  resolvePeriodAdminStaffId,
} from "@/lib/auth"
import { createReopenRequest, listReopenRequestsByPeriodId } from "@/lib/finance/reopen-request"
import { AccountingPeriodReopenRequestStatus } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

function parseRequestStatus(
  value: string | null
): AccountingPeriodReopenRequestStatus | undefined {
  const raw = value?.trim().toUpperCase()
  if (!raw) return undefined
  if (
    (Object.values(AccountingPeriodReopenRequestStatus) as string[]).includes(raw)
  ) {
    return raw as AccountingPeriodReopenRequestStatus
  }
  return undefined
}

async function resolvePeriodActor(branchId: string) {
  const actor = requirePeriodAdminActor(await getSession())
  const staffId = await resolvePeriodAdminStaffId(prisma, actor.staffId, {
    branchIdHint: branchId,
  })
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { name: true },
  })
  return {
    staffId,
    name: staff?.name ?? null,
    role: actor.role,
  }
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const status = parseRequestStatus(req.nextUrl.searchParams.get("status"))
    const requests = await listReopenRequestsByPeriodId(prisma, id, {
      ...(status ? { status } : {}),
    })
    return NextResponse.json({ requests })
  } catch (err: unknown) {
    return financeErrorResponse(
      err,
      "GET finance/periods/[id]/reopen-requests error"
    )
  }
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as {
      reason?: unknown
    }
    const reason = String(body.reason ?? "").trim()
    if (!reason) {
      return NextResponse.json(
        { error: "reason is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const period = await prisma.accountingPeriod.findUnique({
      where: { id },
      select: { branchId: true },
    })
    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found", code: "PERIOD_NOT_FOUND" },
        { status: 404 }
      )
    }

    const requester = await resolvePeriodActor(period.branchId)

    const request = await prisma.$transaction(async (tx) =>
      createReopenRequest(tx, {
        periodId: id,
        reason,
        requestedBy: requester,
      })
    )

    return NextResponse.json({ request })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(
      err,
      "POST finance/periods/[id]/reopen-requests error"
    )
  }
}
