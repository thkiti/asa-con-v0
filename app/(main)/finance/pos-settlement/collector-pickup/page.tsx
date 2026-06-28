import Link from "next/link"
import { redirect } from "next/navigation"
import { CollectorPickupSettlementPage } from "@/components/finance/CollectorPickupSettlementPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { getSession } from "@/lib/auth"
import { canAccessCollectorPickupSettlementUi } from "@/lib/finance-ui/collector-pickup-settlement"

export default async function FinanceCollectorPickupSettlementPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!canAccessCollectorPickupSettlementUi(session.role)) {
    redirect("/unauthorized")
  }

  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <EntityContextPageHeading
        title="Collector pickup settlement"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Review persisted COLLECT reports and post Stage 2 settlement — Dr 1031 Cash
        in Transit, Cr 1001 Cash in Drawer.
      </p>
      <div className="mt-6">
        <CollectorPickupSettlementPage />
      </div>
    </main>
  )
}
