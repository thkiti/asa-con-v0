import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { getMasterStaffEvidenceMobileStatus } from "@/lib/master/staff-evidence"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? ""
    if (!token) {
      throw new PosLookupError("token is required", "INVALID_TOKEN", 400)
    }
    const status = await getMasterStaffEvidenceMobileStatus(prisma, id, token)
    return NextResponse.json({ ok: true, ...status })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/staff/[id]/evidence/mobile-status")
  }
}
