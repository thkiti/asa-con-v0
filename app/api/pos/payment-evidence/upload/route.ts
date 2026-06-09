import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { uploadPaymentEvidenceForReceipt } from "@/lib/pos/payment-evidence-upload"
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

    const form = await req.formData()
    const file = form.get("file")
    const receiptNoRaw = form.get("receiptNo")

    if (!(file instanceof Blob) || typeof receiptNoRaw !== "string") {
      throw new PosLookupError("Invalid upload body", "INVALID_BODY", 400)
    }

    const receiptNo = receiptNoRaw.trim()
    if (!receiptNo) {
      throw new PosLookupError("receiptNo is required", "INVALID_RECEIPT_NO", 400)
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const contentType =
      typeof file.type === "string" && file.type.startsWith("image/")
        ? file.type
        : "image/jpeg"

    const result = await uploadPaymentEvidenceForReceipt(prisma, {
      branchId,
      branchCode,
      receiptNo,
      fileBuffer: buf,
      contentType,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "POST /api/pos/payment-evidence/upload")
  }
}
