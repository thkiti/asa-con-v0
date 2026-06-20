import { redirect } from "next/navigation"

/** Legacy hub URL — F0.1 menu uses /finance/daily-work. */
export default function FinanceTransactionsLegacyPage() {
  redirect("/finance/daily-work")
}
