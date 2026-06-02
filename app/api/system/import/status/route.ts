import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { importErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import { getStaffBootstrapStatus } from "@/lib/auth/staff-bootstrap-status"
import { prisma } from "@/lib/shared/prisma"
import {
  readLegacyArchiveManifest,
  summarizeArchiveStatus,
} from "@/lib/import/archive/read-manifest"
import { listImportReports } from "@/lib/import/report-store"
import { assertImportApplyAllowed } from "@/lib/import/safety"

export async function GET() {
  try {
    requireSystemImportActor(await getSession())

    const [manifest, reports, staffBootstrap] = await Promise.all([
      readLegacyArchiveManifest(),
      listImportReports({ limit: 10 }),
      getStaffBootstrapStatus(prisma),
    ])
    const archive = summarizeArchiveStatus(manifest)

    let productionGuardActive = false
    try {
      assertImportApplyAllowed(true)
    } catch {
      productionGuardActive = true
    }

    return NextResponse.json({
      archive,
      latestReports: reports,
      staffBootstrap,
      productionGuardActive,
      importAllowProduction: process.env.IMPORT_ALLOW_PRODUCTION === "true",
    })
  } catch (err) {
    return importErrorResponse(err, "GET /api/system/import/status")
  }
}
