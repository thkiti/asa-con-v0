import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  buildPosDailyReadReport,
  buildPosReadZCumulativeToDateReport,
  validateReadZBangkokDate,
} from "@/lib/pos/build-pos-read-report"
import { requirePosReportContext } from "@/lib/pos/pos-report-context"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"
import { prisma } from "@/lib/shared/prisma"

type Body = {
  staffId?: string
  password?: string
  scope?: string
  bangkokDate?: string
}

/** READ Z historical lookup — view another date or cumulative month-to-date (read-only, branch-scoped). */
export async function POST(req: Request) {
  try {
    const session = await getSession()
    const ctx = requirePosReportContext(session)

    const body = (await req.json()) as Body
    const staffCode = String(body.staffId || "").trim()
    const password = String(body.password ?? "")
    const scope = String(body.scope || "").trim()
    const bangkokDate = String(body.bangkokDate || "").trim()

    if (scope !== "daily" && scope !== "cumulative-to-date") {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 })
    }

    let reportStaffId: string
    let reportStaffName: string

    if (staffCode || password) {
      if (!staffCode) {
        return NextResponse.json({ error: "Missing staffId" }, { status: 400 })
      }
      if (!password) {
        return NextResponse.json({ error: "Missing password" }, { status: 400 })
      }

      const auth = await verifyPosReportStaffCredentials(prisma, {
        staffCode,
        password,
        intent: "READ_Z_REVIEW",
      })
      if (!auth.ok) {
        return NextResponse.json(
          { error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" },
          { status: 401 }
        )
      }
      reportStaffId = auth.staff.staffId
      reportStaffName = auth.staff.name
    } else {
      reportStaffId = ctx.sessionStaffId
      reportStaffName = session?.name?.trim() || ctx.sessionStaffId
    }

    if (scope === "daily") {
      const dateError = validateReadZBangkokDate(bangkokDate)
      if (dateError) {
        return NextResponse.json({ error: dateError }, { status: 400 })
      }

      const report = await buildPosDailyReadReport(prisma, {
        branchId: ctx.branchId,
        branchCode: ctx.branchCode,
        branchName: ctx.branchName,
        staffId: reportStaffId,
        staffName: reportStaffName,
        mode: "Z",
        bangkokDate,
      })

      return NextResponse.json({ ok: true, readZReview: true, ...report })
    }

    const endYmd = bangkokDate
    if (!endYmd) {
      return NextResponse.json(
        { error: "Missing bangkokDate for cumulative scope" },
        { status: 400 }
      )
    }
    const dateError = validateReadZBangkokDate(endYmd)
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 })
    }

    const report = await buildPosReadZCumulativeToDateReport(prisma, {
      branchId: ctx.branchId,
      branchCode: ctx.branchCode,
      branchName: ctx.branchName,
      staffId: reportStaffId,
      staffName: reportStaffName,
      endYmd,
    })

    return NextResponse.json({ ok: true, readZReview: true, ...report })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "POST /api/pos/read-z-review")
  }
}
