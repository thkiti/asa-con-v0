import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  buildPosCollectReport,
  validateCollectDateRange,
} from "@/lib/pos/build-pos-read-report"
import { requirePosReportContext } from "@/lib/pos/pos-report-context"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"
import { persistCollectorReport } from "@/lib/pos/persist-collector-report"
import { prisma } from "@/lib/shared/prisma"

type Body = {
  staffId?: string
  password?: string
  dateFrom?: string
  dateTo?: string
  /** Preview only — skip CollectorReport persistence until PRINT REPORT. */
  persist?: boolean
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    const ctx = requirePosReportContext(session)

    const body = (await req.json()) as Body
    const staffCode = String(body.staffId || "").trim()
    const password = String(body.password ?? "")
    const dateFrom = String(body.dateFrom || "").trim()
    const dateTo = String(body.dateTo || "").trim()

    if (!staffCode) {
      return NextResponse.json({ error: "Missing staffId" }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: "Missing password" }, { status: 400 })
    }
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Missing dateFrom or dateTo" },
        { status: 400 }
      )
    }

    const rangeError = validateCollectDateRange(dateFrom, dateTo)
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 400 })
    }

    const auth = await verifyPosReportStaffCredentials(prisma, {
      staffCode,
      password,
      intent: "COLLECT",
    })
    if (!auth.ok) {
      if (auth.code === "no_collect_permission") {
        return NextResponse.json(
          {
            error: "COLLECTOR is available to HO staff only",
          },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      )
    }

    const report = await buildPosCollectReport(prisma, {
      branchId: ctx.branchId,
      branchCode: ctx.branchCode,
      branchName: ctx.branchName,
      staffId: auth.staff.staffId,
      staffName: auth.staff.name,
      dateFrom,
      dateTo,
    })

    const shouldPersist = body.persist === true
    if (!shouldPersist) {
      return NextResponse.json({ ok: true, ...report })
    }

    const persisted = await persistCollectorReport(prisma, {
      branchId: ctx.branchId,
      staffId: auth.staff.staffId,
      report,
    })

    return NextResponse.json({ ok: true, ...persisted.report })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "POST /api/pos/collect-report")
  }
}
