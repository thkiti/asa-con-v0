import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { parseReconciliationSnapshotBody } from "@/app/api/finance/shared/parse-reconciliation-snapshot-body"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
  resolvePeriodAdminStaffId,
} from "@/lib/auth"
import {
  createManualSnapshot,
  listReconciliationSnapshots,
} from "@/lib/finance/reconciliation-snapshot"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || undefined

    const limitParam = req.nextUrl.searchParams.get("limit")
    let limit: number | undefined
    if (limitParam !== null && limitParam.trim() !== "") {
      const parsed = Number(limitParam.trim())
      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { error: "Invalid limit", code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }
      limit = parsed
    }

    const snapshots = await listReconciliationSnapshots(prisma, { branchId, limit })
    return NextResponse.json({ snapshots })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/reconciliation/snapshots error")
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const scope = parseReconciliationSnapshotBody(body)

    const session = await getSession()
    const actor = requirePeriodAdminActor(session)

    const createdByStaffId = await resolvePeriodAdminStaffId(prisma, actor.staffId, {
      branchIdHint: session?.branchId,
    })

    const snapshot = await createManualSnapshot(prisma, {
      ...scope,
      createdByStaffId,
    })

    return NextResponse.json({ snapshot }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "POST finance/reconciliation/snapshots error")
  }
}
