import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { parsePatchStaffBody, patchStaff } from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const body = parsePatchStaffBody(await req.json())
    const item = await patchStaff(prisma, id, body, {
      actorStaffId: session.staffId,
    })
    return NextResponse.json({ item })
  } catch (err: unknown) {
    return masterErrorResponse(err, "PATCH /api/master/staff/[id]")
  }
}
