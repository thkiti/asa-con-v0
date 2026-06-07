import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { buildPosDailyReadReport } from "@/lib/pos/build-pos-read-report"
import { requirePosReportContext } from "@/lib/pos/pos-report-context"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"
import { prisma } from "@/lib/shared/prisma"

type Body = {
  staffId?: string
  password?: string
  mode?: string
}

/** READ X / READ Z — read-only daily sales report (Bangkok calendar day). */
export async function POST(req: Request) {
  try {
    const ctx = requirePosReportContext(await getSession())

    const body = (await req.json()) as Body
    const staffCode = String(body.staffId || "").trim()
    const password = String(body.password ?? "")
    const mode = String(body.mode || "").toUpperCase()

    if (!staffCode) {
      return NextResponse.json({ error: "Missing staffId" }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: "Missing password" }, { status: 400 })
    }
    if (mode !== "X" && mode !== "Z") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const auth = await verifyPosReportStaffCredentials(prisma, {
      staffCode,
      password,
      intent: "READ",
    })
    if (!auth.ok) {
      return NextResponse.json(
        { error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      )
    }

    const report = await buildPosDailyReadReport(prisma, {
      branchId: ctx.branchId,
      branchCode: ctx.branchCode,
      branchName: ctx.branchName,
      staffId: auth.staff.staffId,
      staffName: auth.staff.name,
      mode,
    })

    return NextResponse.json({ ok: true, ...report })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "POST /api/pos/read-report")
  }
}
