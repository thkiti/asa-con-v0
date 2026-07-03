import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankReconciliationErrorResponse } from "@/app/api/finance/bank-reconciliation/shared/bank-reconciliation-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import {
  listBankReconciliations,
  upsertBankReconciliationDraft,
} from "@/lib/finance/bank-reconciliation"
import { prisma } from "@/lib/shared/prisma"

function parseOptionalAmount(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === "number" || typeof value === "string") return value
  return String(value)
}

function parseStatus(value: string | null): PeriodReconciliationStatus | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (
    trimmed === "DRAFT" ||
    trimmed === "SUBMITTED" ||
    trimmed === "CONFIRMED" ||
    trimmed === "LOCKED"
  ) {
    return trimmed
  }
  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const params = req.nextUrl.searchParams

    const result = await listBankReconciliations(
      prisma,
      applyFinanceVoucherListScope(
        {
          periodKey: params.get("periodKey")?.trim() || undefined,
          branchId: params.get("branchId")?.trim() || undefined,
          glAccountId: params.get("glAccountId")?.trim() || undefined,
          status: parseStatus(params.get("status")),
          limit: params.get("limit") ? Number(params.get("limit")) : undefined,
          offset: params.get("offset") ? Number(params.get("offset")) : undefined,
        },
        legalEntityCode
      )
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    return bankReconciliationErrorResponse(err, "GET bank-reconciliation")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const body = (await req.json()) as Record<string, unknown>

    const periodKey = String(body.periodKey ?? "").trim()
    const glAccountId = String(body.glAccountId ?? "").trim()
    const glAccountCode = String(body.glAccountCode ?? "").trim()
    if (!periodKey || (!glAccountId && !glAccountCode)) {
      return NextResponse.json(
        {
          error: "periodKey and glAccountId or glAccountCode are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const item = await upsertBankReconciliationDraft({
      legalEntityCode,
      periodKey,
      branchId:
        body.branchId != null ? String(body.branchId).trim() || null : null,
      glAccountId: glAccountId || undefined,
      glAccountCode: glAccountCode || undefined,
      bankStatementBalance: String(body.bankStatementBalance ?? "0"),
      outstandingDeposits: parseOptionalAmount(body.outstandingDeposits),
      outstandingPayments: parseOptionalAmount(body.outstandingPayments),
      bankCharges: parseOptionalAmount(body.bankCharges),
      interest: parseOptionalAmount(body.interest),
      adjustments: parseOptionalAmount(body.adjustments),
      note: body.note != null ? String(body.note) : null,
      evidenceNote: body.evidenceNote != null ? String(body.evidenceNote) : null,
      actorStaffId: actor.staffId,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return bankReconciliationErrorResponse(err, "POST bank-reconciliation")
  }
}
