import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { invoiceVoucherErrorResponse } from "@/app/api/finance/invoice-vouchers/shared/invoice-voucher-api-errors"
import {
  parseDueDate,
  parseInvoiceDate,
  parseInvoiceVoucherSaveLines,
} from "@/app/api/finance/invoice-vouchers/shared/parse-invoice-voucher-body"
import { parseInvoiceVoucherListQuery } from "@/app/api/finance/invoice-vouchers/shared/parse-invoice-voucher-query"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { PeriodAdminAuthError } from "@/lib/auth"
import { createInvoiceVoucherDraft } from "@/lib/finance/invoice-voucher/invoice-voucher-save"
import { getInvoiceVoucherById, listInvoiceVouchers } from "@/lib/finance/invoice-voucher/invoice-voucher-read"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const filter = applyFinanceVoucherListScope(
      parseInvoiceVoucherListQuery(req.nextUrl.searchParams),
      legalEntityCode
    )
    const result = await listInvoiceVouchers(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return invoiceVoucherErrorResponse(err, "GET invoice-vouchers")
    }
    return invoiceVoucherErrorResponse(err, "GET invoice-vouchers")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const body = (await req.json()) as Record<string, unknown>

    const branchId = String(body.branchId ?? "").trim()
    const customerName = String(body.customerName ?? "").trim()

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!customerName) {
      return NextResponse.json(
        { error: "customerName is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const entry = await createInvoiceVoucherDraft({
      branchId,
      legalEntityCode,
      invoiceDate: parseInvoiceDate(body.invoiceDate),
      dueDate: parseDueDate(body.dueDate),
      customerName,
      description:
        body.description != null ? String(body.description).trim() || null : null,
      refNo: body.refNo != null ? String(body.refNo).trim() || null : null,
      createdByStaffId: actor.staffId,
      lines: parseInvoiceVoucherSaveLines(body.lines),
    })

    const detail = await getInvoiceVoucherById(prisma, entry.id, legalEntityCode)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return invoiceVoucherErrorResponse(err, "POST invoice-vouchers")
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
        err.message.includes("invoiceDate") ||
        err.message.includes("dueDate"))
    ) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return invoiceVoucherErrorResponse(err, "POST invoice-vouchers")
  }
}
