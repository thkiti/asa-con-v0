import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { importErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import type { ImportEntity } from "@/lib/import"
import { listImportReports } from "@/lib/import/report-store"

const ENTITIES: ImportEntity[] = ["branch", "product", "reference-stock", "staff"]

export async function GET(req: NextRequest) {
  try {
    requireSystemImportActor(await getSession())
    const entityParam = req.nextUrl.searchParams.get("entity")
    const entity = entityParam && ENTITIES.includes(entityParam as ImportEntity)
      ? (entityParam as ImportEntity)
      : undefined
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20")

    const reports = await listImportReports({
      entity,
      limit: Number.isFinite(limit) ? limit : 20,
    })

    return NextResponse.json({ reports })
  } catch (err) {
    return importErrorResponse(err, "GET /api/system/import/reports")
  }
}
