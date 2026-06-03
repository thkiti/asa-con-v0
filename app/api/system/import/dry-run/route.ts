import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { importErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import type { ImportEntity } from "@/lib/import"
import { toImportApiResult } from "@/lib/import/import-api-result"
import { runImportPhase } from "@/lib/import/run-phase"
import { createImportDb } from "@/lib/import/import-db"

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

    const report = await runImportPhase(
      entity,
      {
        profile: String(body.profile ?? "devboard-v1").trim() || "devboard-v1",
        apply: false,
        sourceDir: body.sourceDir ? String(body.sourceDir).trim() : undefined,
      },
      createImportDb()
    )

    return NextResponse.json(toImportApiResult(entity, report))
  } catch (err) {
    return importErrorResponse(err, "POST /api/system/import/dry-run")
  }
}
