import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { revenueVoucherErrorResponse } from "@/app/api/finance/revenue-vouchers/shared/revenue-voucher-api-errors"
import {
  parseEntryDate,
  parseRevenueVoucherSaveLines,
} from "@/app/api/finance/revenue-vouchers/shared/parse-revenue-voucher-body"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { getRevenueVoucherById } from "@/lib/finance/revenue-voucher/revenue-voucher-read"
import { updateRevenueVoucherDraft } from "@/lib/finance/revenue-voucher/revenue-voucher-save"
import { deleteDraftRevenueVoucher } from "@/lib/finance/revenue-voucher/revenue-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const entry = await getRevenueVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return revenueVoucherErrorResponse(err, "GET revenue-vouchers/[id]")
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const entry = await updateRevenueVoucherDraft({
      entryId: id,
      legalEntityCode,
      ...(body.entryDate != null
        ? { entryDate: parseEntryDate(body.entryDate) }
        : {}),
      ...(body.receiveToAccountId != null
        ? { receiveToAccountId: String(body.receiveToAccountId).trim() }
        : {}),
      ...(body.receivedFromName != null
        ? { receivedFromName: String(body.receivedFromName).trim() }
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
      ...(body.receiptNo !== undefined
        ? {
            receiptNo:
              body.receiptNo != null ? String(body.receiptNo).trim() || null : null,
          }
        : {}),
      lines: parseRevenueVoucherSaveLines(body.lines),
    })

    const detail = await getRevenueVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return revenueVoucherErrorResponse(err, "PATCH revenue-vouchers/[id]")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return revenueVoucherErrorResponse(err, "PATCH revenue-vouchers/[id]")
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    await deleteDraftRevenueVoucher({ entryId: id, legalEntityCode })
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return revenueVoucherErrorResponse(err, "DELETE revenue-vouchers/[id]")
  }
}
