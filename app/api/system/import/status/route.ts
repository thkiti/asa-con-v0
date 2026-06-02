import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { importErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import {
  readLegacyArchiveManifest,
  summarizeArchiveStatus,
} from "@/lib/import/archive/read-manifest"
import { listImportReports } from "@/lib/import/report-store"
import { assertImportApplyAllowed } from "@/lib/import/safety"

export async function GET() {
  try {
    requireSystemImportActor(await getSession())

    const manifest = await readLegacyArchiveManifest()
    const archive = summarizeArchiveStatus(manifest)
    const reports = await listImportReports({ limit: 10 })

    let productionGuardActive = false
    try {
      assertImportApplyAllowed(true)
    } catch {
      productionGuardActive = true
    }

    return NextResponse.json({
      archive,
      latestReports: reports,
      productionGuardActive,
      importAllowProduction: process.env.IMPORT_ALLOW_PRODUCTION === "true",
    })
  } catch (err) {
    return importErrorResponse(err, "GET /api/system/import/status")
  }
}
