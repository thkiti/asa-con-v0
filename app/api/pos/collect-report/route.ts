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
import { prisma } from "@/lib/shared/prisma"

type Body = {
  staffId?: string
  password?: string
  dateFrom?: string
  dateTo?: string
}

export async function POST(req: Request) {
  try {
    const ctx = requirePosReportContext(await getSession())

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
            error:
              "บัญชีนี้ยังไม่ได้รับสิทธิ์ COLLECTOR — ให้ HO เปิดในเมนูพนักงาน",
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

    return NextResponse.json({ ok: true, ...report })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "POST /api/pos/collect-report")
  }
}
