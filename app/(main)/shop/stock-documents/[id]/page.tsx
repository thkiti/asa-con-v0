import Link from "next/link"
import { StockDocumentEditorController } from "@/components/stock/StockDocumentEditorController"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditStockDocumentPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/shop/stock-documents"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Stock documents
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Edit stock document</h1>
      <div className="mt-6">
        <StockDocumentEditorController mode="edit" documentId={id} />
      </div>
    </main>
  )
}
