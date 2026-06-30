import type { Prisma } from "@/generated/prisma/client"
import { DocumentArchiveError, DocumentArchiveErrorCodes } from "./errors"

export async function applyReceiptArchivePdfReady(
  tx: Prisma.TransactionClient,
  input: {
    receiptId: string
    documentArchiveId: string
    pdfPath: string
    pdfBlobUrl: string | null
    pdfGeneratedAt: Date
  }
) {
  const receiptId = String(input.receiptId ?? "").trim()
  const documentArchiveId = String(input.documentArchiveId ?? "").trim()
  if (!receiptId || !documentArchiveId) {
    throw new DocumentArchiveError(
      "Receipt archive apply requires receiptId and documentArchiveId",
      DocumentArchiveErrorCodes.INVALID_PATH
    )
  }

  const existing = await tx.receipt.findUnique({
    where: { id: receiptId },
    select: { pdfPath: true, documentArchiveId: true },
  })
  if (existing?.pdfPath) {
    return existing
  }

  await tx.documentArchive.update({
    where: { id: documentArchiveId },
    data: {
      status: "ACTIVE",
      pdfPath: input.pdfPath,
      pdfBlobUrl: input.pdfBlobUrl,
      generatedAt: input.pdfGeneratedAt,
      errorMessage: null,
    },
  })

  try {
    return await tx.receipt.update({
      where: { id: receiptId, pdfPath: null },
      data: {
        documentArchiveId,
        pdfPath: input.pdfPath,
        pdfBlobUrl: input.pdfBlobUrl,
        pdfGeneratedAt: input.pdfGeneratedAt,
      },
    })
  } catch (err: unknown) {
    const linked = await tx.receipt.findUnique({
      where: { id: receiptId },
      select: { pdfPath: true },
    })
    if (linked?.pdfPath) {
      return linked
    }
    throw err
  }
}

export async function markReceiptArchiveFailed(
  client: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: { documentArchiveId: string; errorMessage: string }
): Promise<void> {
  const documentArchiveId = String(input.documentArchiveId ?? "").trim()
  if (!documentArchiveId) return

  await client.documentArchive.update({
    where: { id: documentArchiveId },
    data: {
      status: "FAILED",
      errorMessage: input.errorMessage.slice(0, 4000),
    },
  })
}
