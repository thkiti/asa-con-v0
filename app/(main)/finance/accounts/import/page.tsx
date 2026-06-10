import Link from "next/link"
import { GlAccountImportPage } from "@/components/finance/GlAccountImportPage"

export default function FinanceAccountsImportPage() {
  return (
    <main className="p-8">
      <Link href="/finance/accounts">← Chart of accounts</Link>
      <h1 className="mt-4 text-xl font-semibold">Import chart of accounts</h1>
      <div className="mt-6">
        <GlAccountImportPage />
      </div>
    </main>
  )
}
