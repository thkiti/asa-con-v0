import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { cashReconciliationErrorResponse } from "@/app/api/finance/cash-reconciliation/shared/cash-reconciliation-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import {
  listCashReconciliations,
  upsertCashReconciliationDraft,
} from "@/lib/finance/cash-reconciliation"
import { prisma } from "@/lib/shared/prisma"

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
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const params = req.nextUrl.searchParams

    const result = await listCashReconciliations(
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
    return cashReconciliationErrorResponse(err, "GET cash-reconciliation")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const body = (await req.json()) as Record<string, unknown>

    const periodKey = String(body.periodKey ?? "").trim()
    const branchId = String(body.branchId ?? "").trim()
    const glAccountId = String(body.glAccountId ?? "").trim()
    const glAccountCode = String(body.glAccountCode ?? "").trim()
    if (!periodKey || !branchId || (!glAccountId && !glAccountCode)) {
      return NextResponse.json(
        {
          error: "periodKey, branchId, and glAccountId or glAccountCode are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const item = await upsertCashReconciliationDraft({
      legalEntityCode,
      periodKey,
      branchId,
      glAccountId: glAccountId || undefined,
      glAccountCode: glAccountCode || undefined,
      actualCountedCash: String(body.actualCountedCash ?? "0"),
      note: body.note != null ? String(body.note) : null,
      evidenceNote: body.evidenceNote != null ? String(body.evidenceNote) : null,
      actorStaffId: actor.staffId,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return cashReconciliationErrorResponse(err, "POST cash-reconciliation")
  }
}
