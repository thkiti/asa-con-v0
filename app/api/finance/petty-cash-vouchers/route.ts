import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { pettyCashVoucherErrorResponse } from "@/app/api/finance/petty-cash-vouchers/shared/petty-cash-voucher-api-errors"
import {
  parseEntryDate,
  parsePettyCashVoucherSaveLines,
} from "@/app/api/finance/petty-cash-vouchers/shared/parse-petty-cash-voucher-body"
import { parsePettyCashVoucherListQuery } from "@/app/api/finance/petty-cash-vouchers/shared/parse-petty-cash-voucher-query"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { createPettyCashVoucherDraft } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-save"
import {
  getPettyCashVoucherById,
  listPettyCashVouchers,
} from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const filter = applyFinanceVoucherListScope(
      parsePettyCashVoucherListQuery(req.nextUrl.searchParams),
      legalEntityCode
    )
    const result = await listPettyCashVouchers(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return pettyCashVoucherErrorResponse(err, "GET petty-cash-vouchers")
    }
    return pettyCashVoucherErrorResponse(err, "GET petty-cash-vouchers")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const body = (await req.json()) as Record<string, unknown>

    const branchId = String(body.branchId ?? "").trim()
    const pettyCashAccountId = String(body.pettyCashAccountId ?? "").trim()
    const payeeName = String(body.payeeName ?? "").trim()

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!pettyCashAccountId) {
      return NextResponse.json(
        { error: "pettyCashAccountId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!payeeName) {
      return NextResponse.json(
        { error: "payeeName is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const entry = await createPettyCashVoucherDraft({
      branchId,
      legalEntityCode,
      entryDate: parseEntryDate(body.entryDate),
      pettyCashAccountId,
      payeeName,
      description:
        body.description != null ? String(body.description).trim() || null : null,
      refNo: body.refNo != null ? String(body.refNo).trim() || null : null,
      createdByStaffId: actor.staffId,
      lines: parsePettyCashVoucherSaveLines(body.lines),
    })

    const detail = await getPettyCashVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return pettyCashVoucherErrorResponse(err, "POST petty-cash-vouchers")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (
      err instanceof Error &&
      (err.message.includes("legalEntityCode") || err.message.includes("entryDate"))
    ) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return pettyCashVoucherErrorResponse(err, "POST petty-cash-vouchers")
  }
}
