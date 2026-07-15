import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { listPosSettlementShopBranches } from "@/lib/finance/pos-settlement/settlement-branches"
import { prisma } from "@/lib/shared/prisma"
import { PeriodAdminAuthError } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    await requireFinanceVoucherScope()
    const items = await listPosSettlementShopBranches(prisma)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    const message = err instanceof Error ? err.message : "Request failed"
    console.error("GET finance/pos-settlement/branches:", err)
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 })
  }
}
