import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  buildStaffEvidenceMobileUploadUrl,
  mintStaffEvidenceCaptureToken,
} from "@/lib/pos/staff-evidence-capture-token"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"

function parseKind(value: unknown): StaffEvidenceFileKind {
  const kind = String(value ?? "").trim()
  if (kind === "ph" || kind === "id") return kind
  throw new PosLookupError("kind must be ph or id", "INVALID_KIND", 400)
}

export async function POST(req: Request) {
  try {
    const session = requirePosShopSession(await getSession())
    const body = (await req.json().catch(() => null)) as { kind?: unknown } | null
    const kind = parseKind(body?.kind)

    const minted = mintStaffEvidenceCaptureToken({
      staffId: session.staffId,
      kind,
    })

    const uploadUrl = buildStaffEvidenceMobileUploadUrl(req.url, minted.token)

    return NextResponse.json({
      ok: true,
      uploadUrl,
      token: minted.token,
      expiresAt: minted.expiresAt,
      kind,
      staffId: session.staffId,
    })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "POST /api/pos/staff-evidence/mobile-link")
  }
}
