import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankStatementErrorResponse } from "@/app/api/finance/bank-statements/shared/bank-statement-api-errors"
import {
  financeVoucherEntityWhere,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import {
  deleteBankStatement,
  getBankStatementById,
  updateBankStatement,
  type BankStatementLineInput,
  type BankStatementStatus,
} from "@/lib/finance/bank-statement"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

function parseLinesFromBody(body: Record<string, unknown>): BankStatementLineInput[] | undefined {
  if (!Array.isArray(body.lines)) return undefined

  const defaultTransactionDate =
    body.statementDate != null ? String(body.statementDate).trim() : ""

  return body.lines.map((raw, index) => {
    const line = (raw ?? {}) as Record<string, unknown>
    const depositRaw = line.depositAmount != null ? String(line.depositAmount).trim() : ""
    const withdrawalRaw =
      line.withdrawalAmount != null ? String(line.withdrawalAmount).trim() : ""
    const transactionDateRaw = String(line.transactionDate ?? "").trim()

    return {
      lineNo: line.lineNo != null ? Number(line.lineNo) : index + 1,
      transactionDate: transactionDateRaw || defaultTransactionDate,
      description: String(line.description ?? ""),
      chequeNumber: line.chequeNumber != null ? String(line.chequeNumber) : null,
      depositAmount: depositRaw || null,
      withdrawalAmount: withdrawalRaw || null,
      runningBalance: String(line.runningBalance ?? "0"),
    }
  })
}

function parseStatus(value: unknown): BankStatementStatus | undefined {
  const normalized = String(value ?? "").trim().toUpperCase()
  if (normalized === "NEW" || normalized === "DRAFT" || normalized === "READY") {
    return normalized
  }
  return undefined
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params

    const item = await getBankStatementById(
      prisma,
      financeVoucherEntityWhere(id, legalEntityCode)
    )

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankStatementErrorResponse(err, "GET bank-statements/[id]")
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const item = await updateBankStatement(prisma, {
      id,
      legalEntityCode,
      bankAccountId: body.bankAccountId != null ? String(body.bankAccountId) : undefined,
      periodKey: body.periodKey != null ? String(body.periodKey) : undefined,
      statementDate: body.statementDate != null ? String(body.statementDate) : undefined,
      openingBalance: body.openingBalance != null ? String(body.openingBalance) : undefined,
      closingBalance: body.closingBalance != null ? String(body.closingBalance) : undefined,
      statementNo: body.statementNo != null ? String(body.statementNo) : undefined,
      status: parseStatus(body.status),
      lines: parseLinesFromBody(body),
      actorStaffId: actor.staffId,
    })

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return bankStatementErrorResponse(err, "PATCH bank-statements/[id]")
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params

    await deleteBankStatement(prisma, financeVoucherEntityWhere(id, legalEntityCode))

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return bankStatementErrorResponse(err, "DELETE bank-statements/[id]")
  }
}
