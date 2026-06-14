import Link from "next/link"
import { RetainedEarningsPage } from "@/components/finance/RetainedEarningsPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Retained Earnings" className="mt-4 text-xl font-semibold" />
      <div className="mt-6">
        <RetainedEarningsPage />
      </div>
    </main>
  )
}
