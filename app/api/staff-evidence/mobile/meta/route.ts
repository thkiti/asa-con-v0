import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { loadStaffEvidenceCaptureMobileMeta } from "@/lib/pos/staff-evidence-capture-token"
import { PosLookupError } from "@/lib/pos/pos-errors"

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? ""
    if (!token) {
      throw new PosLookupError("token is required", "INVALID_TOKEN", 400)
    }

    const meta = loadStaffEvidenceCaptureMobileMeta(token)
    return NextResponse.json({ ok: true, ...meta })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    console.error("GET /api/staff-evidence/mobile/meta:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
