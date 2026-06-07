import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { requirePosReportContext } from "@/lib/pos/pos-report-context"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"
import { prisma } from "@/lib/shared/prisma"

type Body = {
  staffId?: string
  password?: string
  intent?: string
}

export async function POST(req: Request) {
  try {
    requirePosReportContext(await getSession())

    const body = (await req.json()) as Body
    const staffId = String(body.staffId || "").trim()
    const password = String(body.password ?? "")
    const intentRaw = String(body.intent || "").toUpperCase()

    const intent =
      intentRaw === "COLLECT"
        ? ("COLLECT" as const)
        : intentRaw === "READ"
          ? ("READ" as const)
          : null

    if (!intent) {
      return NextResponse.json(
        { error: "intent must be READ or COLLECT" },
        { status: 400 }
      )
    }

    const v = await verifyPosReportStaffCredentials(prisma, {
      staffCode: staffId,
      password,
      intent,
    })

    if (!v.ok) {
      if (v.code === "no_collect_permission") {
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

    return NextResponse.json({
      ok: true,
      staffId: v.staff.staffId,
      staffName: v.staff.name,
    })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "POST /api/pos/verify-pos-staff")
  }
}
