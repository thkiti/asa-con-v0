import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { pettyCashVoucherErrorResponse } from "@/app/api/finance/petty-cash-vouchers/shared/petty-cash-voucher-api-errors"
import {
  parseEntryDate,
  parsePettyCashVoucherSaveLines,
} from "@/app/api/finance/petty-cash-vouchers/shared/parse-petty-cash-voucher-body"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { getPettyCashVoucherById } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { updatePettyCashVoucherDraft } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-save"
import { deleteDraftPettyCashVoucher } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const entry = await getPettyCashVoucherById(prisma, id, legalEntityCode)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return pettyCashVoucherErrorResponse(err, "GET petty-cash-vouchers/[id]")
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const entry = await updatePettyCashVoucherDraft({
      entryId: id,
      legalEntityCode,
      ...(body.entryDate != null ? { entryDate: parseEntryDate(body.entryDate) } : {}),
      ...(body.payeeName != null ? { payeeName: String(body.payeeName).trim() } : {}),
      ...(body.description !== undefined
        ? {
            description:
              body.description != null ? String(body.description).trim() || null : null,
          }
        : {}),
      ...(body.refNo !== undefined
        ? { refNo: body.refNo != null ? String(body.refNo).trim() || null : null }
        : {}),
      lines: parsePettyCashVoucherSaveLines(body.lines),
    })

    const detail = await getPettyCashVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return pettyCashVoucherErrorResponse(err, "PATCH petty-cash-vouchers/[id]")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return pettyCashVoucherErrorResponse(err, "PATCH petty-cash-vouchers/[id]")
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const { id } = await context.params
    await deleteDraftPettyCashVoucher({ entryId: id, legalEntityCode })
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return pettyCashVoucherErrorResponse(err, "DELETE petty-cash-vouchers/[id]")
  }
}
