import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { paymentVoucherErrorResponse } from "@/app/api/finance/payment-vouchers/shared/payment-voucher-api-errors"
import {
  parseEntryDate,
  parsePaymentVoucherSaveLines,
} from "@/app/api/finance/payment-vouchers/shared/parse-payment-voucher-body"
import { parsePaymentVoucherListQuery } from "@/app/api/finance/payment-vouchers/shared/parse-payment-voucher-query"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { createPaymentVoucherDraft } from "@/lib/finance/payment-voucher/payment-voucher-save"
import { getPaymentVoucherById, listPaymentVouchers } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const filter = applyFinanceVoucherListScope(
      parsePaymentVoucherListQuery(req.nextUrl.searchParams),
      legalEntityCode
    )
    const result = await listPaymentVouchers(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return paymentVoucherErrorResponse(err, "GET payment-vouchers")
    }
    return paymentVoucherErrorResponse(err, "GET payment-vouchers")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const body = (await req.json()) as Record<string, unknown>

    const branchId = String(body.branchId ?? "").trim()
    const payFromAccountId = String(body.payFromAccountId ?? "").trim()
    const payeeName = String(body.payeeName ?? "").trim()

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!payFromAccountId) {
      return NextResponse.json(
        { error: "payFromAccountId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!payeeName) {
      return NextResponse.json(
        { error: "payeeName is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const entry = await createPaymentVoucherDraft({
      branchId,
      legalEntityCode,
      entryDate: parseEntryDate(body.entryDate),
      payFromAccountId,
      payeeName,
      description:
        body.description != null ? String(body.description).trim() || null : null,
      refNo: body.refNo != null ? String(body.refNo).trim() || null : null,
      chequeNo: body.chequeNo != null ? String(body.chequeNo).trim() || null : null,
      createdByStaffId: actor.staffId,
      lines: parsePaymentVoucherSaveLines(body.lines),
    })

    const detail = await getPaymentVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return paymentVoucherErrorResponse(err, "POST payment-vouchers")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (
      err instanceof Error &&
      (err.message.includes("legalEntityCode") ||
        err.message.includes("entryDate"))
    ) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return paymentVoucherErrorResponse(err, "POST payment-vouchers")
  }
}
