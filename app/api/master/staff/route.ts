import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { listStaff, parseStaffListQuery } from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const query = parseStaffListQuery(req.nextUrl.searchParams)
    const items = await listStaff(prisma, query)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/staff")
  }
}
