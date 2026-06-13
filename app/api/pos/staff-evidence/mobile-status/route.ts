import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { getStaffEvidenceCaptureUploadStatus } from "@/lib/pos/staff-evidence-capture-upload"
import { verifyStaffEvidenceCaptureToken } from "@/lib/pos/staff-evidence-capture-token"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"

export async function GET(req: Request) {
  try {
    const session = requirePosShopSession(await getSession())
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? ""
    if (!token) {
      throw new PosLookupError("token is required", "INVALID_TOKEN", 400)
    }

    const claims = verifyStaffEvidenceCaptureToken(token)
    if (claims.staffId !== session.staffId) {
      throw new PosLookupError("Forbidden", "FORBIDDEN", 403)
    }

    const status = await getStaffEvidenceCaptureUploadStatus(token)
    return NextResponse.json({ ok: true, ...status })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "GET /api/pos/staff-evidence/mobile-status")
  }
}
