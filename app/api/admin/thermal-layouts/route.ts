import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"
import { loadAllThermalDocumentLayouts } from "@/lib/thermal-layout"

export async function GET() {
  try {
    requireMasterDatabaseSession(await getSession())
    const layouts = await loadAllThermalDocumentLayouts(prisma)
    return NextResponse.json({ layouts })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/admin/thermal-layouts")
  }
}
