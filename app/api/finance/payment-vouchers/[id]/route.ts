import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { paymentVoucherErrorResponse } from "@/app/api/finance/payment-vouchers/shared/payment-voucher-api-errors"
import {
  parseEntryDate,
  parsePaymentVoucherSaveLines,
} from "@/app/api/finance/payment-vouchers/shared/parse-payment-voucher-body"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { getPaymentVoucherById } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { updatePaymentVoucherDraft } from "@/lib/finance/payment-voucher/payment-voucher-save"
import { deleteDraftPaymentVoucher } from "@/lib/finance/payment-voucher/payment-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const entry = await getPaymentVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return paymentVoucherErrorResponse(err, "GET payment-vouchers/[id]")
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const entry = await updatePaymentVoucherDraft({
      entryId: id,
      legalEntityCode,
      ...(body.entryDate != null
        ? { entryDate: parseEntryDate(body.entryDate) }
        : {}),
      ...(body.payFromAccountId != null
        ? { payFromAccountId: String(body.payFromAccountId).trim() }
        : {}),
      ...(body.payeeName != null
        ? { payeeName: String(body.payeeName).trim() }
        : {}),
      ...(body.description !== undefined
        ? {
            description:
              body.description != null ? String(body.description).trim() || null : null,
          }
        : {}),
      ...(body.refNo !== undefined
        ? { refNo: body.refNo != null ? String(body.refNo).trim() || null : null }
        : {}),
      ...(body.chequeNo !== undefined
        ? {
            chequeNo:
              body.chequeNo != null ? String(body.chequeNo).trim() || null : null,
          }
        : {}),
      lines: parsePaymentVoucherSaveLines(body.lines),
    })

    const detail = await getPaymentVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return paymentVoucherErrorResponse(err, "PATCH payment-vouchers/[id]")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return paymentVoucherErrorResponse(err, "PATCH payment-vouchers/[id]")
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    await deleteDraftPaymentVoucher({ entryId: id, legalEntityCode })
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return paymentVoucherErrorResponse(err, "DELETE payment-vouchers/[id]")
  }
}
