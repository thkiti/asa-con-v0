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
} from "@/lib/auth"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
} from "@/lib/finance/period-close"
import {
  listAccountingPeriods,
  toAccountingPeriodListRow,
  type AccountingPeriodListRow,
} from "@/lib/finance/period-list"
import { bootstrapPeriodIfMissing } from "@/lib/finance/period-setup"
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
  branchId: string,
  periodKey: string
): Promise<AccountingPeriodListRow | null> {
  const row = await db.accountingPeriod.findUnique({
    where: {
      branchId_periodKey: { branchId, periodKey },
    },
    include: {
      branch: {
        select: { name: true },
      },
    },
  })

  return row ? toAccountingPeriodListRow(row) : null
}

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || undefined
    const periodKey = req.nextUrl.searchParams.get("periodKey")?.trim() || undefined

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
      branchId,
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

    const branchId = String(body.branchId ?? "").trim()
    const periodKey = String(body.periodKey ?? "").trim()

    if (!branchId || !periodKey) {
      return NextResponse.json(
        { error: "branchId and periodKey are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    requirePeriodAdminActor(await getSession())

    await prisma.$transaction(async (tx) => {
      await bootstrapPeriodIfMissing(tx, { branchId, periodKey })
    })

    const period = await loadPeriodDto(prisma, branchId, periodKey)
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
    }

    const branchId = String(body.branchId ?? "").trim()
    const periodKey = String(body.periodKey ?? "").trim()
    const action = parsePeriodAction(body.action)

    if (!branchId || !periodKey || !body.action) {
      return NextResponse.json(
        { error: "branchId, periodKey, and action are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: "Invalid action", code: "INVALID_ACTION" },
        { status: 400 }
      )
    }

    requirePeriodAdminActor(await getSession())

    await prisma.$transaction(async (tx) => {
      if (action === "SOFT_CLOSE") {
        await closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })
      } else if (action === "HARD_CLOSE") {
        await closeAccountingPeriod(tx, { branchId, periodKey, mode: "HARD" })
      } else {
        await reopenAccountingPeriod(tx, { branchId, periodKey })
      }
    })

    const period = await loadPeriodDto(prisma, branchId, periodKey)
    if (!period) {
      throw new Error(`Accounting period ${periodKey} not found after update`)
    }

    return NextResponse.json({ period })
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
