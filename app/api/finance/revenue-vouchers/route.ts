import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { revenueVoucherErrorResponse } from "@/app/api/finance/revenue-vouchers/shared/revenue-voucher-api-errors"
import {
  parseEntryDate,
  parseLegalEntityCode,
  parseRevenueVoucherSaveLines,
} from "@/app/api/finance/revenue-vouchers/shared/parse-revenue-voucher-body"
import { parseRevenueVoucherListQuery } from "@/app/api/finance/revenue-vouchers/shared/parse-revenue-voucher-query"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { createRevenueVoucherDraft } from "@/lib/finance/revenue-voucher/revenue-voucher-save"
import { getRevenueVoucherById, listRevenueVouchers } from "@/lib/finance/revenue-voucher/revenue-voucher-read"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requirePeriodAdminActor(await getSession())
    const filter = parseRevenueVoucherListQuery(req.nextUrl.searchParams)
    const result = await listRevenueVouchers(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return revenueVoucherErrorResponse(err, "GET revenue-vouchers")
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = requirePeriodAdminActor(await getSession())
    const body = (await req.json()) as Record<string, unknown>

    const branchId = String(body.branchId ?? "").trim()
    const receiveToAccountId = String(body.receiveToAccountId ?? "").trim()
    const receivedFromName = String(body.receivedFromName ?? "").trim()

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!receiveToAccountId) {
      return NextResponse.json(
        { error: "receiveToAccountId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    if (!receivedFromName) {
      return NextResponse.json(
        { error: "receivedFromName is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const entry = await createRevenueVoucherDraft({
      branchId,
      legalEntityCode: parseLegalEntityCode(body.legalEntityCode),
      entryDate: parseEntryDate(body.entryDate),
      receiveToAccountId,
      receivedFromName,
      description:
        body.description != null ? String(body.description).trim() || null : null,
      refNo: body.refNo != null ? String(body.refNo).trim() || null : null,
      receiptNo: body.receiptNo != null ? String(body.receiptNo).trim() || null : null,
      createdByStaffId: actor.staffId,
      lines: parseRevenueVoucherSaveLines(body.lines),
    })

    const detail = await getRevenueVoucherById(prisma, entry.id)
    return NextResponse.json({ entry: detail })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return revenueVoucherErrorResponse(err, "POST revenue-vouchers")
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
    return revenueVoucherErrorResponse(err, "POST revenue-vouchers")
  }
}
