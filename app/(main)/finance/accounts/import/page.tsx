import Link from "next/link"
import { GlAccountImportPage } from "@/components/finance/GlAccountImportPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function FinanceAccountsImportPage() {
  return (
    <main className="p-8">
      <Link href="/finance/accounts">← Chart of accounts</Link>
      <EntityContextPageHeading title="Import chart of accounts" className="mt-4 text-xl font-semibold" />
      <div className="mt-6">
        <GlAccountImportPage />
      </div>
    </main>
  )
}
