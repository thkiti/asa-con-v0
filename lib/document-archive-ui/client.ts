import type { DocumentArchiveKind, DocumentKind } from "@/generated/prisma/client"
import { buildDocumentArchiveStatusPath } from "./paths"

export type DocumentArchiveUploadLink = {
  documentKind: DocumentKind
  documentId: string
  documentNo: string
}

export type DocumentArchiveUploadInput = {
  file: File
  archiveKind?: DocumentArchiveKind
  legalEntityCode: string
  branchId?: string | null
  archiveNo?: string | null
  referenceNo?: string | null
  links: DocumentArchiveUploadLink[]
}

export async function fetchDocumentArchivePdfStatus(input: {
  documentKind: DocumentKind
  documentId: string
  documentNo?: string
  workflowStatus?: string
  archiveKind?: DocumentArchiveKind
}): Promise<boolean | null> {
  const res = await fetch(
    buildDocumentArchiveStatusPath({
      documentKind: input.documentKind,
      documentId: input.documentId,
      documentNo: input.documentNo,
      workflowStatus: input.workflowStatus,
      archiveKind: input.archiveKind ?? "DOCUMENT_PDF",
    })
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? "Failed to load archive status")
  }
  const body = (await res.json()) as { pdfAvailable?: boolean | null }
  return body.pdfAvailable ?? null
}

export async function uploadDocumentArchivePdf(
  input: DocumentArchiveUploadInput
): Promise<void> {
  const form = new FormData()
  form.set("file", input.file)
  form.set("archiveKind", input.archiveKind ?? "DOCUMENT_PDF")
  form.set("legalEntityCode", input.legalEntityCode)
  if (input.branchId?.trim()) {
    form.set("branchId", input.branchId.trim())
  }
  if (input.archiveNo?.trim()) {
    form.set("archiveNo", input.archiveNo.trim())
  }
  if (input.referenceNo?.trim()) {
    form.set("referenceNo", input.referenceNo.trim())
  }
  form.set(
    "links",
    JSON.stringify(
      input.links.map((link) => ({
        documentKind: link.documentKind,
        documentId: link.documentId,
        documentNo: link.documentNo,
      }))
    )
  )

  const res = await fetch("/api/document-archive", {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? "Archive upload failed")
  }
}
