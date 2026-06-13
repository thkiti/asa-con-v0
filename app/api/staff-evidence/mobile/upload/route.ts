import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import {
  buildStaffEvidenceMobileUploadPagePath,
  isStaffEvidenceHtmlFormUpload,
  renderStaffEvidenceMobileUploadErrorPage,
  renderStaffEvidenceMobileUploadSuccessPage,
  staffEvidenceHtmlResponse,
} from "@/lib/pos/staff-evidence-mobile-html"
import { uploadStaffEvidenceCaptureToBlob } from "@/lib/pos/staff-evidence-capture-upload"
import { PosLookupError } from "@/lib/pos/pos-errors"

export async function POST(req: Request) {
  let token = ""
  let htmlForm = false

  try {
    const form = await req.formData()
    htmlForm = isStaffEvidenceHtmlFormUpload(form)
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

    await uploadStaffEvidenceCaptureToBlob({
      token,
      fileBuffer: buf,
      contentType,
    })

    if (htmlForm) {
      return staffEvidenceHtmlResponse(renderStaffEvidenceMobileUploadSuccessPage(), 200)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      if (htmlForm) {
        return staffEvidenceHtmlResponse(
          renderStaffEvidenceMobileUploadErrorPage({
            title: err.code === "TOKEN_EXPIRED" ? "Link Expired" : "Upload failed",
            message: err.message,
            retryUrl: token ? buildStaffEvidenceMobileUploadPagePath(token) : null,
          }),
          err.httpStatus
        )
      }

      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }

    console.error("POST /api/staff-evidence/mobile/upload:", err)

    if (htmlForm) {
      return staffEvidenceHtmlResponse(
        renderStaffEvidenceMobileUploadErrorPage({
          message: "Internal error",
          retryUrl: token ? buildStaffEvidenceMobileUploadPagePath(token) : null,
        }),
        500
      )
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
