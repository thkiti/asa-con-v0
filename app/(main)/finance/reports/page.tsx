import { redirect } from "next/navigation"

/** Legacy hub URL — F0 menu uses /finance/ledger. */
export default function FinanceReportsLegacyPage() {
  redirect("/finance/ledger")
}
