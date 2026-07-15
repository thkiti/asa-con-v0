import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankDepositSettlementErrorResponse } from "@/app/api/finance/pos-settlement/shared/bank-deposit-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getBankDepositSettlementStatus } from "@/lib/finance/pos-settlement/bank-deposit-reconciliation"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()

    if (legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE) {
      throw new PosSettlementError(
        "POS settlement is AS / ASAS only",
        PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
        403
      )
    }

    const collectorReportId = String(
      req.nextUrl.searchParams.get("collectorReportId") ?? ""
    ).trim()
    if (!collectorReportId) {
      return NextResponse.json(
        { error: "collectorReportId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const result = await getBankDepositSettlementStatus(prisma, collectorReportId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return bankDepositSettlementErrorResponse(
      err,
      "GET finance/pos-settlement/bank-deposit/status"
    )
  }
}
