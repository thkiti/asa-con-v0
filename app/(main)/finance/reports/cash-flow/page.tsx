import Link from "next/link"
import { CashFlowPage } from "@/components/finance/CashFlowPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Cash Flow" className="mt-4 text-xl font-semibold" />
      <div className="mt-6">
        <CashFlowPage />
      </div>
    </main>
  )
}
