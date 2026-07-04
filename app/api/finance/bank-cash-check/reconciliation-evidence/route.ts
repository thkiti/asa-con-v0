import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankCashJournalErrorResponse } from "@/app/api/finance/bank-cash-journal/shared/bank-cash-journal-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { loadBankCashCheckReconciliationEvidence } from "@/lib/finance/bank-cash-check"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const params = req.nextUrl.searchParams
    const periodKey = params.get("periodKey")?.trim() ?? ""
    const glAccountId = params.get("glAccountId")?.trim() ?? ""
    const glAccountCode = params.get("glAccountCode")?.trim() ?? ""

    if (!periodKey || (!glAccountId && !glAccountCode)) {
      return NextResponse.json(
        {
          error: "periodKey and glAccountId or glAccountCode are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    let resolvedGlAccountId = glAccountId
    let resolvedGlAccountCode = glAccountCode

    if (!resolvedGlAccountId) {
      const account = await prisma.glAccount.findFirst({
        where: { code: glAccountCode },
        select: { id: true, code: true },
      })
      if (!account) {
        return NextResponse.json(
          { error: "GL account not found", code: "NOT_FOUND" },
          { status: 404 }
        )
      }
      resolvedGlAccountId = account.id
      resolvedGlAccountCode = account.code
    } else if (!resolvedGlAccountCode) {
      const account = await prisma.glAccount.findUnique({
        where: { id: resolvedGlAccountId },
        select: { code: true },
      })
      resolvedGlAccountCode = account?.code ?? ""
    }

    const evidence = await loadBankCashCheckReconciliationEvidence(
      prisma,
      applyFinanceVoucherListScope(
        {
          periodKey,
          glAccountId: resolvedGlAccountId,
          glAccountCode: resolvedGlAccountCode,
        },
        legalEntityCode
      )
    )

    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    return bankCashJournalErrorResponse(err, "GET bank-cash-check/reconciliation-evidence")
  }
}
