import Link from "next/link"
import { EndDocumentController } from "@/components/stock/end/EndDocumentController"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EndStockDocumentPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-[1400px] p-6">
      <Link
        href="/shop/stock-documents"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Stock documents
      </Link>
      <div className="mt-6">
        <EndDocumentController documentId={id} />
      </div>
    </main>
  )
}
