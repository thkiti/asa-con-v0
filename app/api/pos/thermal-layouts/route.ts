import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { requirePosReportContext } from "@/lib/pos/pos-report-context"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { loadThermalLayouts } from "@/lib/thermal/load-layouts"
import { THERMAL_DOCUMENT_TYPES } from "@/lib/thermal/types"
import { prisma } from "@/lib/shared/prisma"

/** Read-only thermal layouts for POS slip rendering (all authenticated shop sessions). */
export async function GET() {
  try {
    requirePosReportContext(await getSession())
    const layouts = await loadThermalLayouts(prisma)
    const resolved = Object.fromEntries(
      THERMAL_DOCUMENT_TYPES.map((type) => [type, resolveThermalLayout(type, layouts)])
    )
    return NextResponse.json({ layouts, resolved })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/thermal-layouts")
  }
}
