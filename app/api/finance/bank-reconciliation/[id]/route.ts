import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankReconciliationErrorResponse } from "@/app/api/finance/bank-reconciliation/shared/bank-reconciliation-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  confirmBankReconciliation,
  getBankReconciliationById,
  lockBankReconciliation,
  submitBankReconciliation,
  updateBankReconciliationDraft,
} from "@/lib/finance/bank-reconciliation"
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
    const item = await getBankReconciliationById(prisma, id, legalEntityCode)
    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankReconciliationErrorResponse(err, "GET bank-reconciliation/[id]")
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action ?? "").trim().toUpperCase()

    if (action === "SUBMIT") {
      const item = await submitBankReconciliation({
        id,
        legalEntityCode,
        actorStaffId: actor.staffId,
      })
      return NextResponse.json({ item })
    }

    if (action === "CONFIRM") {
      const item = await confirmBankReconciliation({
        id,
        legalEntityCode,
        actorStaffId: actor.staffId,
      })
      return NextResponse.json({ item })
    }

    if (action === "LOCK") {
      const item = await lockBankReconciliation({
        id,
        legalEntityCode,
        actorStaffId: actor.staffId,
      })
      return NextResponse.json({ item })
    }

    const item = await updateBankReconciliationDraft({
      id,
      legalEntityCode,
      bankStatementBalance: parseOptionalAmount(body.bankStatementBalance),
      outstandingDeposits: parseOptionalAmount(body.outstandingDeposits),
      outstandingPayments: parseOptionalAmount(body.outstandingPayments),
      bankCharges: parseOptionalAmount(body.bankCharges),
      interest: parseOptionalAmount(body.interest),
      adjustments: parseOptionalAmount(body.adjustments),
      note: body.note != null ? String(body.note) : undefined,
      evidenceNote: body.evidenceNote != null ? String(body.evidenceNote) : undefined,
      actorStaffId: actor.staffId,
    })

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankReconciliationErrorResponse(err, "PATCH bank-reconciliation/[id]")
  }
}
