import { redirect } from "next/navigation"

/** Legacy hub URL — F0.1 menu uses /finance/dashboard. */
export default function FinanceReportsLegacyPage() {
  redirect("/finance/dashboard")
}
