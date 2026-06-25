import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  ReceiptLookupError,
  ReceiptLookupErrorCodes,
} from "@/lib/pos/receipt-lookup-errors"
import {
  assertReceiptPdfBranchAccess,
  loadReceiptPdfAccessRow,
  readReceiptArchivePdfBuffer,
  safeReceiptPdfFileName,
} from "@/lib/pos/receipt-pdf-access"
import { prisma } from "@/lib/shared/prisma"
import {
  requireStockDocumentSession,
  resolveListBranchId,
} from "@/lib/stock/document-read/document-access"

type Context = {
  params: Promise<{ receiptId: string }>
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = resolveListBranchId(
      session,
      req.nextUrl.searchParams.get("branchId")
    )
    const { receiptId } = await context.params

    const row = await loadReceiptPdfAccessRow(prisma, receiptId)
    if (!row) {
      throw new ReceiptLookupError(
        "Receipt PDF archive is not ready",
        ReceiptLookupErrorCodes.PDF_NOT_READY,
        404
      )
    }

    assertReceiptPdfBranchAccess(row, branchId)

    const dispositionParam = req.nextUrl.searchParams.get("disposition")
    const disposition =
      dispositionParam === "attachment" ? "attachment" : "inline"
    const buffer = await readReceiptArchivePdfBuffer(row)
    const fileName = safeReceiptPdfFileName(row.receiptNo, receiptId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/receipts/[receiptId]/pdf")
  }
}
