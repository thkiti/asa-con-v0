import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"
import {
  parseThermalDocumentType,
  parseUpdateThermalDocumentLayoutBody,
  updateThermalDocumentLayout,
} from "@/lib/thermal-layout"
import { ThermalLayoutError } from "@/lib/thermal-layout/errors"

type RouteContext = { params: Promise<{ type: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { type: typeParam } = await context.params
    let documentType
    try {
      documentType = parseThermalDocumentType(typeParam)
    } catch {
      throw new ThermalLayoutError(
        `Invalid document type: ${typeParam}`,
        "VALIDATION_ERROR",
        400
      )
    }
    const body = parseUpdateThermalDocumentLayoutBody(await req.json())
    const layout = await updateThermalDocumentLayout(prisma, documentType, body)
    return NextResponse.json({ layout })
  } catch (err: unknown) {
    return masterErrorResponse(err, "PATCH /api/admin/thermal-layouts/[type]")
  }
}
