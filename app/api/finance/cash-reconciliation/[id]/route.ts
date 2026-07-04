import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { cashReconciliationErrorResponse } from "@/app/api/finance/cash-reconciliation/shared/cash-reconciliation-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  confirmCashReconciliation,
  getCashReconciliationById,
  lockCashReconciliation,
  submitCashReconciliation,
  updateCashReconciliationDraft,
} from "@/lib/finance/cash-reconciliation"
import { prisma } from "@/lib/shared/prisma"

function parseOptionalAmount(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === "number" || typeof value === "string") return value
  return String(value)
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const item = await getCashReconciliationById(prisma, id, legalEntityCode)
    return NextResponse.json({ item })
  } catch (err: unknown) {
    return cashReconciliationErrorResponse(err, "GET cash-reconciliation/[id]")
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action ?? "").trim().toUpperCase()

    if (action === "SUBMIT") {
      const item = await submitCashReconciliation({
        id,
        legalEntityCode,
        actorStaffId: actor.staffId,
      })
      return NextResponse.json({ item })
    }

    if (action === "CONFIRM") {
      const item = await confirmCashReconciliation({
        id,
        legalEntityCode,
        actorStaffId: actor.staffId,
      })
      return NextResponse.json({ item })
    }

    if (action === "LOCK") {
      const item = await lockCashReconciliation({
        id,
        legalEntityCode,
        actorStaffId: actor.staffId,
      })
      return NextResponse.json({ item })
    }

    const item = await updateCashReconciliationDraft({
      id,
      legalEntityCode,
      actualCountedCash: parseOptionalAmount(body.actualCountedCash),
      note: body.note != null ? String(body.note) : undefined,
      evidenceNote: body.evidenceNote != null ? String(body.evidenceNote) : undefined,
      actorStaffId: actor.staffId,
    })

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return cashReconciliationErrorResponse(err, "PATCH cash-reconciliation/[id]")
  }
}
