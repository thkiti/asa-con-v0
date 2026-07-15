import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankDepositSettlementErrorResponse } from "@/app/api/finance/pos-settlement/shared/bank-deposit-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { executePayInConfirm } from "@/lib/finance/pos-settlement/execute-pay-in-confirm"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"

type ConfirmBody = {
  collectorReportId?: string
  bankDepositDate?: string
  bankAccountCode?: string
}

export async function POST(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()

    if (legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE) {
      throw new PosSettlementError(
        "POS settlement is AS / ASAS only",
        PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
        403
      )
    }

    const body = (await req.json()) as ConfirmBody
    const collectorReportId = String(body.collectorReportId ?? "").trim()
    const bankDepositDate = String(body.bankDepositDate ?? "").trim()

    if (!collectorReportId) {
      return NextResponse.json(
        { error: "collectorReportId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    if (!bankDepositDate) {
      return NextResponse.json(
        { error: "bankDepositDate is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const result = await executePayInConfirm({
      collectorReportId,
      bankDepositDate,
      bankAccountCode: body.bankAccountCode,
      legalEntityCode,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return bankDepositSettlementErrorResponse(
      err,
      "POST finance/pos-settlement/pay-in/confirm"
    )
  }
}
