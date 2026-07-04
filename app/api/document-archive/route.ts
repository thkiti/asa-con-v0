import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { documentArchiveApiErrorResponse } from "@/app/api/document-archive/shared/document-archive-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { uploadDocumentArchive } from "@/lib/document-archive/upload-archive"
import {
  parseDocumentArchiveKind,
  parseDocumentArchiveLinks,
  assertMimeTypeAllowedForArchiveKind,
  normalizeMimeType,
} from "@/lib/document-archive/validation"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: Request) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)
    const form = await req.formData()

    const file = form.get("file")
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const archiveKind = parseDocumentArchiveKind(form.get("archiveKind"))
    const links = parseDocumentArchiveLinks(form.get("links"))
    const branchIdRaw = form.get("branchId")
    const archiveNoRaw = form.get("archiveNo")
    const referenceNoRaw = form.get("referenceNo")
    const fileNameRaw = form.get("fileName")
    const mimeTypeRaw = form.get("mimeType")
    const clientStatusRaw = form.get("status")

    const entityOverride = String(form.get("legalEntityCode") ?? "").trim()
    if (entityOverride && entityOverride !== legalEntityCode) {
      return NextResponse.json(
        {
          error: "legalEntityCode must match the signed-in finance entity",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName =
      file instanceof File && file.name
        ? file.name
        : typeof fileNameRaw === "string"
          ? fileNameRaw
          : null
    const mimeType = normalizeMimeType(
      originalName,
      typeof mimeTypeRaw === "string"
        ? mimeTypeRaw
        : typeof file.type === "string"
          ? file.type
          : null
    )
    assertMimeTypeAllowedForArchiveKind(archiveKind, mimeType)

    const result = await uploadDocumentArchive(prisma, {
      archiveKind,
      legalEntityCode,
      branchId: typeof branchIdRaw === "string" ? branchIdRaw : null,
      archiveNo: typeof archiveNoRaw === "string" ? archiveNoRaw : null,
      referenceNo: typeof referenceNoRaw === "string" ? referenceNoRaw : null,
      archivedByStaffId: actor.staffId,
      fileBuffer: buffer,
      fileName: originalName,
      mimeType,
      links,
      clientStatus: typeof clientStatusRaw === "string" ? clientStatusRaw : null,
    })

    return NextResponse.json({ ok: true, ...result }, { status: 201 })
  } catch (err: unknown) {
    return documentArchiveApiErrorResponse(err, "POST /api/document-archive")
  }
}
