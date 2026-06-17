import Link from "next/link"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { OpeningBalanceHubPage } from "@/components/finance/OpeningBalanceHubPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function OpeningBalancePage() {
  return (
    <main className="p-8">
      <FinanceDocumentContainer>
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
      </FinanceDocumentContainer>
    </main>
  )
}
