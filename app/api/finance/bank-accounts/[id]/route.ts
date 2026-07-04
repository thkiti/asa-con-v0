import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankAccountErrorResponse } from "@/app/api/finance/bank-accounts/shared/bank-account-api-errors"
import {
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { getBankAccountById, updateBankAccount } from "@/lib/finance/bank-account"
import { prisma } from "@/lib/shared/prisma"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params

    const item = await getBankAccountById(prisma, {
      id,
      legalEntityCode,
    })

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankAccountErrorResponse(err, "GET bank-accounts/[id]")
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const item = await updateBankAccount(prisma, {
      id,
      legalEntityCode,
      ...(body.bankName != null ? { bankName: String(body.bankName) } : {}),
      ...(body.accountNumber != null ? { accountNumber: String(body.accountNumber) } : {}),
      ...(body.accountName != null ? { accountName: String(body.accountName) } : {}),
      ...(body.currencyCode != null ? { currencyCode: String(body.currencyCode) } : {}),
      ...(body.glAccountId != null ? { glAccountId: String(body.glAccountId) } : {}),
      ...(body.glAccountCode != null ? { glAccountCode: String(body.glAccountCode) } : {}),
      ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
    })

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankAccountErrorResponse(err, "PATCH bank-accounts/[id]")
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params

    const item = await updateBankAccount(prisma, {
      id,
      legalEntityCode,
      isActive: false,
    })

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankAccountErrorResponse(err, "DELETE bank-accounts/[id]")
  }
}
