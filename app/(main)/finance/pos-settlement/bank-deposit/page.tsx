import Link from "next/link"
import { redirect } from "next/navigation"
import { BankDepositSettlementPage } from "@/components/finance/BankDepositSettlementPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { getSession } from "@/lib/auth"
import { canAccessBankDepositSettlementUi } from "@/lib/finance-ui/bank-deposit-settlement"

export default async function FinanceBankDepositSettlementPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!canAccessBankDepositSettlementUi(session.role)) {
    redirect("/unauthorized")
  }

  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <EntityContextPageHeading
        title="Bank deposit settlement"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Review posted collector pickup balances and post Stage 2 bank deposit — Dr
        1021 Bank, Cr 1031 Cash in Transit.
      </p>
      <div className="mt-6">
        <BankDepositSettlementPage />
      </div>
    </main>
  )
}
