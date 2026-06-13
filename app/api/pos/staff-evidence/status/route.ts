import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { getStaffEvidenceStatus } from "@/lib/pos/staff-evidence"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    const session = requirePosShopSession(await getSession())
    const status = await getStaffEvidenceStatus(prisma, session.staffId)
    return NextResponse.json(status)
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "GET /api/pos/staff-evidence/status")
  }
}
