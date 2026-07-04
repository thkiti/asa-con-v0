import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { collectorPickupSettlementErrorResponse } from "@/app/api/finance/pos-settlement/shared/collector-pickup-api-errors"
import { parseReconciliationFilter } from "@/app/api/finance/shared/parse-finance-filter"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { listCollectorPickupSettlementStatuses } from "@/lib/finance/pos-settlement/collector-pickup-reconciliation"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)

    if (legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE) {
      throw new PosSettlementError(
        "POS settlement is AS / ASAS only",
        PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
        403
      )
    }

    const { branchId, from, to } = parseReconciliationFilter(req.nextUrl.searchParams)
    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const items = await listCollectorPickupSettlementStatuses(prisma, {
      branchId,
      from,
      to,
    })

    return NextResponse.json({ items })
  } catch (err: unknown) {
    return collectorPickupSettlementErrorResponse(
      err,
      "GET finance/pos-settlement/collector-pickup/status-list"
    )
  }
}
