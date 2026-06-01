import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
  resolvePeriodAdminStaffId,
} from "@/lib/auth"
import {
  approveReopenRequest,
  cancelReopenRequest,
  getReopenRequestById,
  rejectReopenRequest,
} from "@/lib/finance/reopen-request"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string; requestId: string }>
}

type ReopenRequestAction = "APPROVE" | "REJECT" | "CANCEL"

function parseReopenRequestAction(value: unknown): ReopenRequestAction | null {
  const raw = String(value ?? "").trim().toUpperCase()
  if (raw === "APPROVE" || raw === "REJECT" || raw === "CANCEL") {
    return raw
  }
  return null
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

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { requestId } = await context.params
    const request = await getReopenRequestById(prisma, requestId)
    return NextResponse.json({ request })
  } catch (err: unknown) {
    return financeErrorResponse(
      err,
      "GET finance/periods/[id]/reopen-requests/[requestId] error"
    )
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { requestId } = await context.params
    const body = (await req.json().catch(() => ({}))) as {
      action?: unknown
      approvalNote?: unknown
      rejectionNote?: unknown
      reviewNote?: unknown
    }

    const action = parseReopenRequestAction(body.action)
    if (!action) {
      return NextResponse.json(
        { error: "Invalid action", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const existing = await getReopenRequestById(prisma, requestId)
    const actor = await resolvePeriodActor(existing.branchId)

    const approvalNote =
      String(body.approvalNote ?? body.reviewNote ?? "").trim() || null
    const rejectionNote =
      String(body.rejectionNote ?? body.reviewNote ?? "").trim() || null

    const request = await prisma.$transaction(async (tx) => {
      if (action === "APPROVE") {
        return approveReopenRequest(tx, {
          requestId,
          approvedBy: actor,
          approvalNote,
        })
      }
      if (action === "REJECT") {
        return rejectReopenRequest(tx, {
          requestId,
          rejectedBy: actor,
          rejectionNote,
        })
      }
      return cancelReopenRequest(tx, {
        requestId,
        cancelledBy: actor,
      })
    })

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
      "PATCH finance/periods/[id]/reopen-requests/[requestId] error"
    )
  }
}
