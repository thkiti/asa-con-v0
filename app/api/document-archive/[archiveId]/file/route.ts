import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { documentArchiveApiErrorResponse } from "@/app/api/document-archive/shared/document-archive-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "@/lib/document-archive/errors"
import {
  loadActiveArchiveById,
  safeArchiveDownloadFileName,
} from "@/lib/document-archive/get-archive-status"
import { readStoredDocumentArchive } from "@/lib/document-archive/storage/store-archive-file"
import { prisma } from "@/lib/shared/prisma"

type Context = {
  params: Promise<{ archiveId: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { archiveId } = await context.params

    const row = await loadActiveArchiveById(prisma, archiveId, legalEntityCode)
    if (!row) {
      throw new DocumentArchiveError(
        "Active document archive not found",
        DocumentArchiveErrorCodes.ARCHIVE_NOT_FOUND,
        404
      )
    }

    const dispositionParam = req.nextUrl.searchParams.get("disposition")
    const disposition =
      dispositionParam === "attachment" ? "attachment" : "inline"
    const buffer = await readStoredDocumentArchive({
      storagePath: row.storagePath,
      storageUrl: row.storageUrl,
      pdfPath: row.pdfPath,
      pdfBlobUrl: row.pdfBlobUrl,
    })
    const fileName = safeArchiveDownloadFileName(row)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err: unknown) {
    return documentArchiveApiErrorResponse(
      err,
      "GET /api/document-archive/[archiveId]/file"
    )
  }
}
