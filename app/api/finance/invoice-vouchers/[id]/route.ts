import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { invoiceVoucherErrorResponse } from "@/app/api/finance/invoice-vouchers/shared/invoice-voucher-api-errors"
import {
  parseDueDate,
  parseInvoiceDate,
  parseInvoiceVoucherSaveLines,
} from "@/app/api/finance/invoice-vouchers/shared/parse-invoice-voucher-body"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { getInvoiceVoucherById } from "@/lib/finance/invoice-voucher/invoice-voucher-read"
import { updateInvoiceVoucherDraft } from "@/lib/finance/invoice-voucher/invoice-voucher-save"
import { deleteDraftInvoiceVoucher } from "@/lib/finance/invoice-voucher/invoice-voucher-workflow"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const entry = await getInvoiceVoucherById(prisma, id)
    return NextResponse.json({ entry })
  } catch (err: unknown) {
    return invoiceVoucherErrorResponse(err, "GET invoice-vouchers/[id]")
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const entry = await updateInvoiceVoucherDraft({
      entryId: id,
      ...(body.invoiceDate != null
        ? { invoiceDate: parseInvoiceDate(body.invoiceDate) }
        : {}),
      ...(body.dueDate !== undefined ? { dueDate: parseDueDate(body.dueDate) } : {}),
      ...(body.customerName != null
        ? { customerName: String(body.customerName).trim() }
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
      lines: parseInvoiceVoucherSaveLines(body.lines),
    })

    const detail = await getInvoiceVoucherById(prisma, entry.id)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return invoiceVoucherErrorResponse(err, "PATCH invoice-vouchers/[id]")
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return invoiceVoucherErrorResponse(err, "PATCH invoice-vouchers/[id]")
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    requirePeriodAdminActor(await getSession())
    const { id } = await context.params
    await deleteDraftInvoiceVoucher({ entryId: id })
    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    return invoiceVoucherErrorResponse(err, "DELETE invoice-vouchers/[id]")
  }
}
