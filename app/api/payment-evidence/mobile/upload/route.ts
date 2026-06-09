import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import {
  buildMobileUploadPagePath,
  htmlResponse,
  isHtmlFormUpload,
  renderMobileUploadErrorPage,
  renderMobileUploadSuccessPage,
} from "@/lib/pos/payment-evidence-mobile-html"
import { uploadPaymentEvidenceWithToken } from "@/lib/pos/payment-evidence-mobile-upload"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: Request) {
  let token = ""
  let htmlForm = false

  try {
    const form = await req.formData()
    htmlForm = isHtmlFormUpload(form)
    const file = form.get("file")
    const tokenRaw = form.get("token")

    if (!(file instanceof Blob) || typeof tokenRaw !== "string") {
      throw new PosLookupError("Invalid upload body", "INVALID_BODY", 400)
    }

    token = tokenRaw.trim()
    if (!token) {
      throw new PosLookupError("token is required", "INVALID_TOKEN", 400)
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const contentType =
      typeof file.type === "string" && file.type.startsWith("image/")
        ? file.type
        : "image/jpeg"

    const result = await uploadPaymentEvidenceWithToken(prisma, {
      token,
      fileBuffer: buf,
      contentType,
    })

    if (htmlForm) {
      return htmlResponse(renderMobileUploadSuccessPage(), 200)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      if (htmlForm) {
        if (err.code === "EVIDENCE_ALREADY_UPLOADED") {
          return htmlResponse(renderMobileUploadSuccessPage(), 200)
        }

        return htmlResponse(
          renderMobileUploadErrorPage({
            title: err.code === "TOKEN_EXPIRED" ? "Link Expired" : "Upload failed",
            message: err.message,
            retryUrl: token ? buildMobileUploadPagePath(token) : null,
          }),
          err.httpStatus
        )
      }

      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }

    console.error("POST /api/payment-evidence/mobile/upload:", err)

    if (htmlForm) {
      return htmlResponse(
        renderMobileUploadErrorPage({
          message: "Internal error",
          retryUrl: token ? buildMobileUploadPagePath(token) : null,
        }),
        500
      )
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
