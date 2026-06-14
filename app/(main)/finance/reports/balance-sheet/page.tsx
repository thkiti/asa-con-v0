import Link from "next/link"
import { BalanceSheetPage } from "@/components/finance/BalanceSheetPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Balance Sheet" className="mt-4 text-xl font-semibold" />
      <div className="mt-6">
        <BalanceSheetPage />
      </div>
    </main>
  )
}
