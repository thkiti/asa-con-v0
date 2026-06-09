import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { loadPaymentEvidenceMobileMeta } from "@/lib/pos/payment-evidence-upload-token"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")?.trim() ?? ""
    if (!token) {
      throw new PosLookupError("token is required", "INVALID_TOKEN", 400)
    }

    const meta = await loadPaymentEvidenceMobileMeta(prisma, token)
    return NextResponse.json({ ok: true, ...meta })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    console.error("GET /api/payment-evidence/mobile/meta:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
