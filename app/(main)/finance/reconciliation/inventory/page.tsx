import Link from "next/link"
import { InventoryReconciliationView } from "@/components/finance/InventoryReconciliationView"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function InventoryReconciliationPage() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Inventory reconciliation" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-zinc-600">
        Compare operational stock valuation against GL inventory balance.
      </p>
      <div className="mt-6">
        <InventoryReconciliationView />
      </div>
    </main>
  )
}
