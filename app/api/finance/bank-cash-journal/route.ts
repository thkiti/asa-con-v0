import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankCashJournalErrorResponse } from "@/app/api/finance/bank-cash-journal/shared/bank-cash-journal-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { getBankCashJournal } from "@/lib/finance/bank-cash-journal"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const params = req.nextUrl.searchParams
    const periodKey = params.get("periodKey")?.trim() ?? ""
    const bankAccountId = params.get("bankAccountId")?.trim() ?? ""
    const branchId = params.get("branchId")?.trim() || undefined

    if (!periodKey || !bankAccountId) {
      return NextResponse.json(
        { error: "periodKey and bankAccountId are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const journal = await getBankCashJournal(
      prisma,
      applyFinanceVoucherListScope(
        { periodKey, bankAccountId, branchId },
        legalEntityCode
      )
    )

    return NextResponse.json({ journal })
  } catch (err: unknown) {
    return bankCashJournalErrorResponse(err, "GET bank-cash-journal")
  }
}
