import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  buildPaymentEvidenceMobileUploadUrl,
  mintPaymentEvidenceMobileUploadToken,
} from "@/lib/pos/payment-evidence-upload-token"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { prisma } from "@/lib/shared/prisma"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

export async function POST(req: Request) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = session.branchId.trim()
    const branchCode = session.branchCode?.trim() ?? ""
    if (!branchId || !branchCode) {
      throw new PosLookupError("Shop session requires branchId", "INVALID_BRANCH", 400)
    }

    const body = (await req.json().catch(() => null)) as { receiptNo?: unknown } | null
    const receiptNo = String(body?.receiptNo ?? "").trim()
    if (!receiptNo) {
      throw new PosLookupError("receiptNo is required", "INVALID_RECEIPT_NO", 400)
    }

    const minted = await mintPaymentEvidenceMobileUploadToken(prisma, {
      branchId,
      branchCode,
      receiptNo,
    })

    const uploadUrl = buildPaymentEvidenceMobileUploadUrl(req.url, minted.token)

    return NextResponse.json({
      ok: true,
      uploadUrl,
      expiresAt: minted.expiresAt,
      receiptNo: receiptNo.toUpperCase(),
    })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "POST /api/pos/payment-evidence/mobile-link")
  }
}
