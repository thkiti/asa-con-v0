import Link from "next/link"
import { OpeningBalanceHubPage } from "@/components/finance/OpeningBalanceHubPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function OpeningBalancePage() {
  return (
    <main className="p-8">
      <Link
        href="/finance"
        className="text-sm text-zinc-600 underline"
      >
        ← Finance
      </Link>
      <EntityContextPageHeading
        title="Opening Balance"
        className="mt-4 text-xl font-semibold"
      />
      <div className="mt-6">
        <OpeningBalanceHubPage />
      </div>
    </main>
  )
}
