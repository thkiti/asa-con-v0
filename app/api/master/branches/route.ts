import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { listBranches, parseBranchListQuery } from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const query = parseBranchListQuery(req.nextUrl.searchParams)
    const items = await listBranches(prisma, query)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/branches")
  }
}
