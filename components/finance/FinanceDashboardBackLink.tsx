"use client"

import {
  PageBackDotButton,
} from "@/components/ui/PageBackDotButton"
import { FINANCE_DASHBOARD_HREF } from "@/lib/main-ui/finance-page-layout"

/** Legacy name — renders standard PageBackDotButton to the finance dashboard. */
export function FinanceDashboardBackLink() {
  return (
    <div className="flex justify-end print:hidden">
      <PageBackDotButton
        fallbackHref={FINANCE_DASHBOARD_HREF}
        tooltip="Back to Finance Dashboard"
        data-testid="finance-dashboard-back-link"
      />
    </div>
  )
}
