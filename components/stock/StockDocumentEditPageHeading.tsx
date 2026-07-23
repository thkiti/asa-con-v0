"use client"

import { useEffect, useState } from "react"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { fetchStockDocumentDetail } from "@/lib/stock-ui/fetchers"
import { formatStaffFacingDocumentTitle } from "@/lib/stock-ui/format"

type StockDocumentEditPageHeadingProps = {
  documentId: string
}

export function StockDocumentEditPageHeading({
  documentId,
}: StockDocumentEditPageHeadingProps) {
  const [title, setTitle] = useState("Stock document")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const detail = await fetchStockDocumentDetail(documentId)
        if (cancelled) return
        const entityCode =
          parseDocumentEntityCode(detail.legalEntityCode) ??
          DEFAULT_DOCUMENT_ENTITY_CODE
        setTitle(
          formatStaffFacingDocumentTitle(
            detail.docType,
            detail.status,
            entityCode
          )
        )
      } catch {
        if (!cancelled) {
          setTitle("Stock document")
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [documentId])

  return (
    <h1
      className="mt-4 text-xl font-semibold"
      data-testid="entity-context-page-title"
    >
      {title}
    </h1>
  )
}
