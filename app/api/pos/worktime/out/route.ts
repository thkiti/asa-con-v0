import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { requirePosWorktimeContext } from "@/lib/pos/pos-worktime-context"
import { recordPosWorktimeClockOut } from "@/lib/pos/worktime"
import { prisma } from "@/lib/shared/prisma"

export async function POST() {
  try {
    const { branchId, staffId } = requirePosWorktimeContext(await getSession())
    const view = await recordPosWorktimeClockOut(prisma, { branchId, staffId })
    return NextResponse.json(view)
  } catch (err: unknown) {
    return posApiErrorResponse(err, "POST /api/pos/worktime/out")
  }
}
