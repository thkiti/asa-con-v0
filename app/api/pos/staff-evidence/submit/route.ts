import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { submitStaffEvidence } from "@/lib/pos/staff-evidence"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"
import { prisma } from "@/lib/shared/prisma"

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const session = requirePosShopSession(await getSession())
    const form = await req.formData()
    const photoFile = form.get("photo")
    const idCardFile = form.get("idCard")

    if (!(photoFile instanceof Blob) || !(idCardFile instanceof Blob)) {
      throw new PosLookupError("photo and idCard files are required", "INVALID_BODY", 400)
    }

    for (const [label, file] of [
      ["photo", photoFile],
      ["idCard", idCardFile],
    ] as const) {
      if (!file.type.startsWith("image/")) {
        throw new PosLookupError(`Invalid image type for ${label}`, "INVALID_IMAGE_TYPE", 400)
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new PosLookupError(`Image too large: ${label}`, "IMAGE_TOO_LARGE", 400)
      }
    }

    const photoBuffer = Buffer.from(await photoFile.arrayBuffer())
    const idCardBuffer = Buffer.from(await idCardFile.arrayBuffer())
    const contentType =
      typeof photoFile.type === "string" && photoFile.type.startsWith("image/")
        ? photoFile.type
        : "image/jpeg"

    const status = await submitStaffEvidence(prisma, {
      staffId: session.staffId,
      photoBuffer,
      idCardBuffer,
      contentType,
    })

    return NextResponse.json({ ok: true, ...status })
  } catch (err: unknown) {
    if (err instanceof PosLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "POST /api/pos/staff-evidence/submit")
  }
}
