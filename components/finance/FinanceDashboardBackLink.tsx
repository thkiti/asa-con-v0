import Link from "next/link"
import { FINANCE_DASHBOARD_HREF } from "@/lib/main-ui/finance-page-layout"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export function FinanceDashboardBackLink() {
  return (
    <Link
      href={FINANCE_DASHBOARD_HREF}
      className={`text-sm print:hidden ${themeLinkMuted}`}
    >
      ← Finance Dashboard
    </Link>
  )
}
