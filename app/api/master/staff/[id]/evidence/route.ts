import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { deleteMasterStaffEvidence, getMasterStaffEvidenceDetail } from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const detail = await getMasterStaffEvidenceDetail(prisma, id)
    return NextResponse.json(detail)
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/staff/[id]/evidence")
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const status = await deleteMasterStaffEvidence(prisma, id)
    return NextResponse.json({ ok: true, ...status })
  } catch (err: unknown) {
    return masterErrorResponse(err, "DELETE /api/master/staff/[id]/evidence")
  }
}
