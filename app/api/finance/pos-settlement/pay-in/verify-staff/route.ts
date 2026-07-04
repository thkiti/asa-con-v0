import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankDepositSettlementErrorResponse } from "@/app/api/finance/pos-settlement/shared/bank-deposit-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"
import { prisma } from "@/lib/shared/prisma"

type VerifyBody = {
  staffId?: string
  password?: string
}

export async function POST(req: Request) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)

    if (legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE) {
      throw new PosSettlementError(
        "POS settlement is AS / ASAS only",
        PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
        403
      )
    }

    const body = (await req.json()) as VerifyBody
    const staffId = String(body.staffId ?? "").trim()
    const password = String(body.password ?? "")

    if (!staffId || !password) {
      return NextResponse.json(
        { error: "staffId and password are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const verified = await verifyPosReportStaffCredentials(prisma, {
      staffCode: staffId,
      password,
      intent: "READ",
    })

    if (!verified.ok) {
      return NextResponse.json(
        { error: "Invalid staff code or password", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      ok: true,
      staffId: verified.staff.staffId,
      staffName: verified.staff.name,
    })
  } catch (err: unknown) {
    if (err instanceof PosSettlementError) {
      return bankDepositSettlementErrorResponse(
        err,
        "POST finance/pos-settlement/pay-in/verify-staff"
      )
    }
    return bankDepositSettlementErrorResponse(
      err,
      "POST finance/pos-settlement/pay-in/verify-staff"
    )
  }
}
