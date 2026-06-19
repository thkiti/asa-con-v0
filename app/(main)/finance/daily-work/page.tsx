import { redirect } from "next/navigation"

/** Legacy hub URL — F0 menu uses /finance/transactions. */
export default function FinanceDailyWorkLegacyPage() {
  redirect("/finance/transactions")
}
