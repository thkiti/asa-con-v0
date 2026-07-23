import "server-only"

import { prisma } from "@/lib/shared/prisma"
import { EndError, EndErrorCodes } from "./end-errors"

export async function getEndDocumentDetail(documentId: string) {
  const id = String(documentId ?? "").trim()
  if (!id) {
    throw new EndError("documentId is required", EndErrorCodes.INVALID_INPUT)
  }

  const document = await prisma.stockDocument.findUnique({
    where: { id },
    include: {
      endLines: {
        orderBy: { productId: "asc" },
        include: {
          product: { select: { id: true, code: true, name: true } },
        },
      },
      endContributions: {
        orderBy: [{ contributionKind: "asc" }, { productId: "asc" }],
      },
      endAuditEvents: {
        orderBy: { at: "desc" },
        take: 50,
      },
      branch: { select: { id: true, code: true, name: true, type: true } },
    },
  })

  if (!document || document.docType !== "END") {
    throw new EndError("END document not found", EndErrorCodes.END_NOT_FOUND, 404)
  }

  const contributionSummary = summarizeContributions(document.endContributions)

  return {
    ...document,
    contributionSummary,
  }
}

function summarizeContributions(
  rows: ReadonlyArray<{
    contributionKind: string
    sourceDocumentType: string
    quantity: number
  }>
) {
  const byKind: Record<string, { count: number; quantity: number }> = {}
  const bySourceType: Record<string, { count: number; quantity: number }> = {}

  for (const row of rows) {
    const kind = byKind[row.contributionKind] ?? { count: 0, quantity: 0 }
    kind.count += 1
    kind.quantity += row.quantity
    byKind[row.contributionKind] = kind

    const src = bySourceType[row.sourceDocumentType] ?? { count: 0, quantity: 0 }
    src.count += 1
    src.quantity += row.quantity
    bySourceType[row.sourceDocumentType] = src
  }

  return { byKind, bySourceType, total: rows.length }
}

export type EndDocumentDetail = Awaited<ReturnType<typeof getEndDocumentDetail>>
