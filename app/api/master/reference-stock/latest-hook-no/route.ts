import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { getNextHookNo } from "@/lib/master/get-next-hook-no"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const hookGroup = String(req.nextUrl.searchParams.get("hookGroup") || "")
      .trim()
      .toUpperCase()
    const nextHookNo = await getNextHookNo(prisma, hookGroup)
    return NextResponse.json({ nextHookNo })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/reference-stock/latest-hook-no")
  }
}
