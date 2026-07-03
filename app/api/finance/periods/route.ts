import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  financeErrorResponse,
  parseAccountingPeriodStatus,
} from "@/app/api/finance/shared/finance-api-errors"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
  resolvePeriodAdminStaffId,
} from "@/lib/auth"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
  type PeriodCloseResult,
} from "@/lib/finance/period-close"
import { assertDirectReopenAllowed } from "@/lib/finance/reopen-request"
import {
  listAccountingPeriods,
  toAccountingPeriodListRow,
  type AccountingPeriodListRow,
} from "@/lib/finance/period-list"
import { bootstrapPeriodIfMissing } from "@/lib/finance/period-setup"
import { isFinanceManualPeriodCreationEnabled } from "@/lib/finance/config"
import { accountingPeriodUniqueWhere } from "@/lib/finance/period-lookup"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"

type PeriodAction = "SOFT_CLOSE" | "HARD_CLOSE" | "REOPEN"

function parsePeriodAction(value: unknown): PeriodAction | null {
  const raw = String(value ?? "").trim().toUpperCase()
  if (raw === "SOFT_CLOSE" || raw === "HARD_CLOSE" || raw === "REOPEN") {
    return raw
  }
  return null
}

async function loadPeriodDto(
  db: typeof prisma,
  periodKey: string,
  legalEntityCode: DocumentEntityCode
): Promise<AccountingPeriodListRow | null> {
  const row = await db.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
    include: {
      branch: {
        select: { name: true },
      },
    },
  })

  return row ? toAccountingPeriodListRow(row) : null
}

function resolveSessionLegalEntityCode(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
): DocumentEntityCode {
  return session.documentEntityCode
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const legalEntityParam = req.nextUrl.searchParams.get("legalEntityCode")?.trim()
    const branchIdParam = req.nextUrl.searchParams.get("branchId")?.trim()
    const periodKey = req.nextUrl.searchParams.get("periodKey")?.trim() || undefined

    const legalEntityCode = (legalEntityParam ||
      session?.documentEntityCode) as DocumentEntityCode | undefined

    if (!legalEntityCode) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHENTICATED" },
        { status: 401 }
      )
    }

    if (branchIdParam) {
      console.warn(
        "[finance/periods] branchId query param is deprecated and ignored; scope by legalEntityCode"
      )
    }

    const statusParam = req.nextUrl.searchParams.get("status")
    let status: AccountingPeriodStatus | undefined
    if (statusParam !== null && statusParam.trim() !== "") {
      const parsed = parseAccountingPeriodStatus(statusParam)
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid status", code: "INVALID_STATUS" },
          { status: 400 }
        )
      }
      status = parsed
    }

    const periods = await listAccountingPeriods(prisma, {
      legalEntityCode,
      periodKey,
      status,
    })
    return NextResponse.json({ periods })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/periods error")
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      branchId?: unknown
      periodKey?: unknown
    }

    const periodKey = String(body.periodKey ?? "").trim()
    const legacyBranchId = String(body.branchId ?? "").trim() || undefined

    if (!periodKey) {
      return NextResponse.json(
        { error: "periodKey is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    if (legacyBranchId) {
      console.warn(
        "[finance/periods] branchId in POST body is deprecated and ignored; scope by session legalEntityCode"
      )
    }

    const session = await getSession()
    requirePeriodAdminActor(session)
    const legalEntityCode = resolveSessionLegalEntityCode(session!)

    if (!isFinanceManualPeriodCreationEnabled()) {
      return NextResponse.json(
        {
          error:
            "Manual accounting period creation is disabled. Periods are opened automatically after hard close.",
          code: "MANUAL_PERIOD_CREATION_DISABLED",
        },
        { status: 403 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await bootstrapPeriodIfMissing(tx, { periodKey, legalEntityCode })
    })

    const period = await loadPeriodDto(prisma, periodKey, legalEntityCode)
    if (!period) {
      throw new Error(`Accounting period ${periodKey} missing after bootstrap`)
    }

    return NextResponse.json({ period })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "POST finance/periods error")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      branchId?: unknown
      periodKey?: unknown
      action?: unknown
      reason?: unknown
    }

    const periodKey = String(body.periodKey ?? "").trim()
    const legacyBranchId = String(body.branchId ?? "").trim() || undefined
    const action = parsePeriodAction(body.action)

    if (!periodKey || !body.action) {
      return NextResponse.json(
        { error: "periodKey and action are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    if (legacyBranchId) {
      console.warn(
        "[finance/periods] branchId in PATCH body is deprecated and ignored; scope by session legalEntityCode"
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: "Invalid action", code: "INVALID_ACTION" },
        { status: 400 }
      )
    }

    const session = await getSession()
    const actor = requirePeriodAdminActor(session)
    const legalEntityCode = resolveSessionLegalEntityCode(session!)

    async function resolvePeriodActor(branchIdHint?: string) {
      const staffId = await resolvePeriodAdminStaffId(prisma, actor.staffId, {
        branchIdHint,
      })
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: { name: true },
      })
      return {
        staffId,
        name: staff?.name ?? null,
        role: actor.role,
      }
    }

    const periodActor =
      action === "HARD_CLOSE" || action === "REOPEN"
        ? await resolvePeriodActor(legacyBranchId)
        : undefined

    const reason = String(body.reason ?? "").trim()

    let hardCloseAdvance: PeriodCloseResult["hardCloseAdvance"]

    await prisma.$transaction(async (tx) => {
      if (action === "SOFT_CLOSE") {
        await closeAccountingPeriod(tx, {
          periodKey,
          legalEntityCode,
          mode: "SOFT",
        })
      } else if (action === "HARD_CLOSE") {
        const result = await closeAccountingPeriod(tx, {
          periodKey,
          legalEntityCode,
          mode: "HARD",
          closedBy: periodActor!,
        })
        hardCloseAdvance = result.hardCloseAdvance
      } else {
        const existing = await tx.accountingPeriod.findUnique({
          where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
        })
        if (existing && existing.status !== "OPEN") {
          assertDirectReopenAllowed(existing.status)
        }
        await reopenAccountingPeriod(tx, {
          periodKey,
          legalEntityCode,
          reason,
          reopenedBy: periodActor!,
        })
      }
    })

    const period = await loadPeriodDto(prisma, periodKey, legalEntityCode)
    if (!period) {
      throw new Error(`Accounting period ${periodKey} not found after update`)
    }

    return NextResponse.json({
      period,
      ...(hardCloseAdvance ? { hardCloseAdvance } : {}),
    })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "PATCH finance/periods error")
  }
}
