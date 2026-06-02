import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { importErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import { assertImportApplyGate } from "@/lib/import/apply-gate"
import { collectSourceChecksums } from "@/lib/import/archive/read-manifest"
import type { ImportEntity } from "@/lib/import"
import { resolveImportProfile } from "@/lib/import/profiles/devboard-v1"
import { runImportPhase } from "@/lib/import/run-phase"
import { createImportDb } from "@/lib/import/run-import"

const ENTITIES: ImportEntity[] = ["branch", "product", "reference-stock", "staff"]

function parseEntity(value: unknown): ImportEntity | null {
  const raw = String(value ?? "").trim()
  return ENTITIES.includes(raw as ImportEntity) ? (raw as ImportEntity) : null
}

export async function POST(req: NextRequest) {
  try {
    requireSystemImportActor(await getSession())
    const body = await req.json()
    const entity = parseEntity(body.entity)
    if (!entity) {
      return NextResponse.json(
        { error: "Invalid import entity", code: "INVALID_ENTITY" },
        { status: 400 }
      )
    }

    const profile = String(body.profile ?? "devboard-v1").trim() || "devboard-v1"
    const sourceDir = body.sourceDir ? String(body.sourceDir).trim() : undefined
    const resolvedProfile = resolveImportProfile({ profile, apply: true, sourceDir })
    const sourceChecksums = await collectSourceChecksums(resolvedProfile.sourceDir)

    await assertImportApplyGate({
      entity,
      profile,
      sourceDir: resolvedProfile.sourceDir,
      dryRunReportId: String(body.dryRunReportId ?? "").trim(),
      confirm: body.confirm === true,
      sourceChecksums,
    })

    const report = await runImportPhase(
      entity,
      {
        profile,
        apply: true,
        sourceDir,
      },
      createImportDb()
    )

    return NextResponse.json(report)
  } catch (err) {
    return importErrorResponse(err, "POST /api/system/import/apply")
  }
}
