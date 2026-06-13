import Link from "next/link"
import { ChangesInEquityPage } from "@/components/finance/ChangesInEquityPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <EntityContextPageHeading
        title="Statement of Changes in Equity"
        className="mt-4 text-xl font-semibold"
      />
      <div className="mt-6">
        <ChangesInEquityPage />
      </div>
    </main>
  )
}
