import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { parseReconciliationFilter } from "@/app/api/finance/shared/parse-finance-filter"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { listJournalEntries, type JournalListFilter } from "@/lib/finance/journal-list"
import { postManualJournalVoucher } from "@/lib/finance/posting"
import type { ManualJournalLineInput } from "@/lib/finance/posting-types"
import { prisma } from "@/lib/shared/prisma"

function parseListFilter(params: URLSearchParams): JournalListFilter {
  const { branchId, from, to } = parseReconciliationFilter(params)
  const periodKey = params.get("periodKey")?.trim() || undefined
  const refType = params.get("refType")?.trim() || undefined

  const limitParam = params.get("limit")
  const offsetParam = params.get("offset")
  let limit: number | undefined
  let offset: number | undefined

  if (limitParam?.trim()) {
    const n = Number(limitParam.trim())
    if (Number.isFinite(n) && n > 0) limit = Math.min(n, 200)
  }
  if (offsetParam?.trim()) {
    const n = Number(offsetParam.trim())
    if (Number.isFinite(n) && n >= 0) offset = n
  }

  return {
    branchId,
    periodKey,
    from,
    to,
    refType,
    limit,
    offset,
  }
}

function parseManualJournalLines(body: unknown): ManualJournalLineInput[] {
  if (!Array.isArray(body)) {
    throw new Error("lines must be an array")
  }
  return body.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`lines[${index}] must be an object`)
    }
    const line = row as Record<string, unknown>
    const accountCode = String(line.accountCode ?? "").trim()
    if (!accountCode) {
      throw new Error(`lines[${index}].accountCode is required`)
    }
    const debit =
      typeof line.debit === "string" || typeof line.debit === "number"
        ? line.debit
        : "0"
    const credit =
      typeof line.credit === "string" || typeof line.credit === "number"
        ? line.credit
        : "0"
    return {
      accountCode,
      debit,
      credit,
      memo: line.memo != null ? String(line.memo) : null,
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const filter = parseListFilter(req.nextUrl.searchParams)
    const result = await listJournalEntries(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/journal-entries")
  }
}

export async function POST(req: NextRequest) {
  try {
    requirePeriodAdminActor(await getSession())
    const body = (await req.json()) as {
      branchId?: unknown
      date?: unknown
      description?: unknown
      refNo?: unknown
      idempotencyKey?: unknown
      lines?: unknown
    }

    const branchId = String(body.branchId ?? "").trim()
    const dateRaw = String(body.date ?? "").trim()
    const idempotencyKey = String(body.idempotencyKey ?? "").trim()

    if (!branchId || !dateRaw || !idempotencyKey) {
      return NextResponse.json(
        {
          error: "branchId, date, and idempotencyKey are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const lines = parseManualJournalLines(body.lines)
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "At least two journal lines are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const date = new Date(dateRaw)
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction((tx) =>
      postManualJournalVoucher({
        tx,
        branchId,
        date,
        description:
          body.description != null ? String(body.description).trim() || null : null,
        refNo: body.refNo != null ? String(body.refNo).trim() || null : null,
        idempotencyKey,
        lines,
      })
    )

    return NextResponse.json({ posted: result })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    if (err instanceof Error && err.message.startsWith("lines")) {
      return NextResponse.json(
        { error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    return financeErrorResponse(err, "POST /api/finance/journal-entries")
  }
}
