import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { mintMasterStaffEvidenceMobileLink } from "@/lib/master/staff-evidence"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { PosLookupError } from "@/lib/pos/pos-errors"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

function parseKind(value: unknown): StaffEvidenceFileKind {
  const kind = String(value ?? "").trim()
  if (kind === "ph" || kind === "id") return kind
  throw new PosLookupError("kind must be ph or id", "INVALID_KIND", 400)
}

export async function POST(req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const body = (await req.json().catch(() => null)) as { kind?: unknown } | null
    const kind = parseKind(body?.kind)
    const result = await mintMasterStaffEvidenceMobileLink(prisma, id, {
      kind,
      requestUrl: req.url,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/staff/[id]/evidence/mobile-link")
  }
}
