import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankStatementErrorResponse } from "@/app/api/finance/bank-statements/shared/bank-statement-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import {
  createBankStatement,
  listBankStatements,
  type BankStatementStatus,
} from "@/lib/finance/bank-statement"
import { prisma } from "@/lib/shared/prisma"

function parseStatus(value: string | null): BankStatementStatus | undefined {
  const normalized = value?.trim().toUpperCase()
  if (normalized === "NEW" || normalized === "DRAFT" || normalized === "READY") {
    return normalized
  }
  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const params = req.nextUrl.searchParams

    const result = await listBankStatements(
      prisma,
      applyFinanceVoucherListScope(
        {
          periodKey: params.get("periodKey") ?? undefined,
          bankAccountId: params.get("bankAccountId") ?? undefined,
          status: parseStatus(params.get("status")),
          search: params.get("search") ?? undefined,
        },
        legalEntityCode
      )
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    return bankStatementErrorResponse(err, "GET bank-statements")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()
    const body = (await req.json()) as Record<string, unknown>

    const item = await createBankStatement(prisma, {
      legalEntityCode,
      bankAccountId: String(body.bankAccountId ?? ""),
      periodKey: String(body.periodKey ?? ""),
      statementDate: String(body.statementDate ?? ""),
      openingBalance: String(body.openingBalance ?? "0"),
      closingBalance: String(body.closingBalance ?? "0"),
      statementNo: body.statementNo != null ? String(body.statementNo) : undefined,
      status: parseStatus(body.status != null ? String(body.status) : null),
      lines: Array.isArray(body.lines) ? (body.lines as never[]) : undefined,
      actorStaffId: actor.staffId,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return bankStatementErrorResponse(err, "POST bank-statements")
  }
}
