import Link from "next/link"
import { StockDocumentEditorController } from "@/components/stock/StockDocumentEditorController"
import { isStockCountStaffEntry } from "@/lib/stock-ui/stock-count-staff-mode"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function EditStockDocumentPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { from } = await searchParams
  const stockCountStaffMode = isStockCountStaffEntry(from)

  return (
    <main
      className={
        stockCountStaffMode
          ? "flex h-dvh flex-col overflow-hidden p-2"
          : "p-8"
      }
    >
      {!stockCountStaffMode ? (
        <>
          <Link
            href="/shop/stock-documents"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Stock documents
          </Link>
          <h1 className="mt-4 text-xl font-semibold">Edit stock document</h1>
        </>
      ) : null}
      <div
        className={
          stockCountStaffMode ? "flex min-h-0 flex-1 flex-col" : "mt-6"
        }
      >
        <StockDocumentEditorController
          mode="edit"
          documentId={id}
          stockCountStaffMode={stockCountStaffMode}
        />
      </div>
    </main>
  )
}
