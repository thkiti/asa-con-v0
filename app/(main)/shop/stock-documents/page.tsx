import Link from "next/link"
import { StockDocumentListController } from "@/components/stock/StockDocumentListController"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function ShopStockDocumentsPage() {
  return (
    <main className="p-8">
      <Link href="/shop" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Shop
      </Link>
      <EntityContextPageHeading title="Stock Document" />
      <p className="mt-2 text-zinc-600">
        Shop transfer, performance, and adjustment documents.
      </p>
      <div className="mt-6">
        <StockDocumentListController />
      </div>
    </main>
  )
}
