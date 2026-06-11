import Link from "next/link"
import { InventoryReconciliationView } from "@/components/finance/InventoryReconciliationView"

export default function InventoryReconciliationPage() {
  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Inventory reconciliation</h1>
      <p className="mt-2 text-zinc-600">
        Compare operational stock valuation against GL inventory balance.
      </p>
      <div className="mt-6">
        <InventoryReconciliationView />
      </div>
    </main>
  )
}
