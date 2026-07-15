import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { GlAccountReconciliationRole } from "@/generated/prisma/client"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  listBankReconciliationAccounts,
  listCashReconciliationAccounts,
} from "@/lib/finance/period-reconciliation-accounts"
import { prisma } from "@/lib/shared/prisma"

function parseRole(value: string | null): GlAccountReconciliationRole | null {
  const raw = value?.trim().toUpperCase()
  if (raw === "BANK") return GlAccountReconciliationRole.BANK
  if (raw === "CASH") return GlAccountReconciliationRole.CASH
  return null
}

export async function GET(req: NextRequest) {
  try {
    const role = parseRole(req.nextUrl.searchParams.get("role"))
    if (!role) {
      return NextResponse.json(
        { error: "role query parameter must be BANK or CASH" },
        { status: 400 }
      )
    }

    const { legalEntityCode } = await requireFinanceVoucherScope()

    const items =
      role === GlAccountReconciliationRole.BANK
        ? await listBankReconciliationAccounts(prisma, legalEntityCode)
        : await listCashReconciliationAccounts(prisma)

    return NextResponse.json({ items })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/period-reconciliation/accounts")
  }
}
