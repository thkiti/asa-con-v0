import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { requirePosWorktimeContext } from "@/lib/pos/pos-worktime-context"
import { buildPosWorktimeView } from "@/lib/pos/worktime"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { branchId, staffId } = requirePosWorktimeContext(await getSession())
    void req.nextUrl.searchParams.get("branchId")
    void req.nextUrl.searchParams.get("staffId")

    const view = await buildPosWorktimeView(prisma, { branchId, staffId })
    return NextResponse.json(view)
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/worktime")
  }
}
