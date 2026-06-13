import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  deleteMasterStaffEvidence,
  getMasterStaffEvidenceDetail,
  submitMasterStaffEvidence,
} from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export async function GET(_req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const detail = await getMasterStaffEvidenceDetail(prisma, id)
    return NextResponse.json(detail)
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/staff/[id]/evidence")
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
    const detail = await deleteMasterStaffEvidence(prisma, id)
    return NextResponse.json({ ok: true, ...detail })
  } catch (err: unknown) {
    return masterErrorResponse(err, "DELETE /api/master/staff/[id]/evidence")
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    requireMasterDatabaseSession(await getSession())
    const { id } = await context.params
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

    const detail = await submitMasterStaffEvidence(prisma, id, {
      photoBuffer,
      idCardBuffer,
      contentType,
    })

    return NextResponse.json({ ok: true, ...detail })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/staff/[id]/evidence")
  }
}
