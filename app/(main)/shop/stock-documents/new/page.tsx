import Link from "next/link"
import { StockDocumentEditorController } from "@/components/stock/StockDocumentEditorController"
import { formatEntityContextTitle } from "@/lib/legal-entity"
import { isShopDocType } from "@/lib/stock-ui/editor-draft-state"
import { formatDocTypeLabel } from "@/lib/stock-ui/format"
import type { DocType } from "@/lib/stock-ui/types"

type PageProps = {
  searchParams: Promise<{ type?: string }>
}

export default async function NewStockDocumentPage({ searchParams }: PageProps) {
  const { type } = await searchParams
  const rawType = String(type ?? "").trim().toUpperCase()
  const docType = isShopDocType(rawType) ? (rawType as DocType) : null

  if (!docType) {
    return (
      <main className="p-8">
        <Link
          href="/shop/stock-documents"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Stock documents
        </Link>
        <h1
          className="mt-4 text-xl font-semibold"
          data-testid="entity-context-page-title"
        >
          {formatEntityContextTitle("AS", "New Document")}
        </h1>
        <p className="mt-2 text-red-700">
          Missing or invalid type. Use TRANSFER_OUT, PERFORMANCE, or ADJUSTMENT.
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <Link
        href="/shop/stock-documents"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Stock documents
      </Link>
      <h1
        className="mt-4 text-xl font-semibold"
        data-testid="entity-context-page-title"
      >
        {formatEntityContextTitle("AS", formatDocTypeLabel(docType))}
      </h1>
      <div className="mt-6">
        <StockDocumentEditorController mode="create" docType={docType} />
      </div>
    </main>
  )
}
