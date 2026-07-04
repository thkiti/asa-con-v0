import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankAccountErrorResponse } from "@/app/api/finance/bank-accounts/shared/bank-account-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { createBankAccount, listBankAccounts, type BankAccountActiveFilter } from "@/lib/finance/bank-account"
import { prisma } from "@/lib/shared/prisma"

function parseActiveFilter(
  activeOnlyParam: string | null,
  statusParam: string | null
): BankAccountActiveFilter {
  const status = statusParam?.trim().toLowerCase()
  if (status === "inactive") return "inactive"
  if (status === "all") return "all"
  if (activeOnlyParam === "false") return "all"
  return "active"
}

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const params = req.nextUrl.searchParams

    const result = await listBankAccounts(
      prisma,
      applyFinanceVoucherListScope(
        {
          activeFilter: parseActiveFilter(
            params.get("activeOnly"),
            params.get("status")
          ),
        },
        legalEntityCode
      )
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    return bankAccountErrorResponse(err, "GET bank-accounts")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const body = (await req.json()) as Record<string, unknown>

    const item = await createBankAccount(prisma, {
      legalEntityCode,
      bankName: String(body.bankName ?? ""),
      accountNumber: String(body.accountNumber ?? ""),
      accountName: String(body.accountName ?? ""),
      currencyCode: body.currencyCode != null ? String(body.currencyCode) : undefined,
      glAccountId: body.glAccountId != null ? String(body.glAccountId) : undefined,
      glAccountCode: body.glAccountCode != null ? String(body.glAccountCode) : undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return bankAccountErrorResponse(err, "POST bank-accounts")
  }
}
