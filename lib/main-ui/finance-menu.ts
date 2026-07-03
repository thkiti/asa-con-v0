import { canAccessMenu } from "@/lib/permissions/menu"
import type { Role } from "@/lib/shared"

/**
 * Finance menu — F0.2 locked information architecture.
 *
 * Document layer (Daily Work): MJV, PAV, INV, REV, Petty Cash
 * Reporting layer (Dashboard): GL, TB, P&L, BS
 * Period layer (Month-End Closing): reconciliation, close readiness, period admin
 * Audit layer (Audit): Voucher Lookup, Document Trace, Attachments
 *
 * No separate Ledger, Transactions, JV, APV, ACC, or Receivables groups.
 * See docs/FINANCE_TRANSACTION_UNIVERSE.md for business direction.
 */

/** Primary F0.2 finance navigation hubs (locked). */
export type FinanceMenuHubKey =
  | "daily-work"
  | "dashboard"
  | "accounting-periods"
  | "audit"

/** Legacy hub routes kept for bookmarks — not on the F0.2 home menu. */
export type FinanceMenuLegacyHubKey =
  | "transactions"
  | "ledger"
  | "reports"
  | "system"

export type FinanceMenuAnyHubKey = FinanceMenuHubKey | FinanceMenuLegacyHubKey

export type FinanceMenuItemStatus = "available" | "planned"

export type FinanceMenuItemBadge = "Done" | "Coming Soon"

export type FinanceMenuItem = {
  key: string
  label: string
  hint?: string
  href?: string
  status: FinanceMenuItemStatus
  badge?: FinanceMenuItemBadge
}

export type FinanceMenuItemGroup = {
  key: string
  label: string
  items: FinanceMenuItem[]
}

export type FinanceMenuHub = {
  key: FinanceMenuAnyHubKey
  label: string
  description: string
  href: string
  items: FinanceMenuItem[]
  itemGroups?: FinanceMenuItemGroup[]
}

const FINANCE_MENU_HUB_ORDER: readonly FinanceMenuHubKey[] = [
  "daily-work",
  "dashboard",
  "accounting-periods",
  "audit",
] as const

function done(
  key: string,
  label: string,
  href: string,
  hint?: string
): FinanceMenuItem {
  return { key, label, href, hint, status: "available", badge: "Done" }
}

function comingSoon(key: string, label: string, hint?: string): FinanceMenuItem {
  return {
    key,
    label,
    hint,
    status: "planned",
    badge: "Coming Soon",
  }
}

function hubHref(key: FinanceMenuAnyHubKey): string {
  return `/finance/${key}`
}

function buildPrimaryFinanceMenuHubs(): Record<
  FinanceMenuHubKey,
  Omit<FinanceMenuHub, "key">
> {
  return {
    "daily-work": {
      label: "Daily Work",
      description:
        "Create and process finance documents — MJV, PAV, INV, REV, and PCV are live.",
      href: hubHref("daily-work"),
      items: [
        done(
          "mjv",
          "MJV • MANUAL JOURNAL VOUCHER",
          "/finance/manual-journal-entries",
          "Manual Journal"
        ),
        done(
          "pav",
          "PAV • PAYMENT VOUCHER",
          "/finance/payment-vouchers",
          "Payment Voucher"
        ),
        done(
          "inv",
          "INV • INVOICE",
          "/finance/invoice-vouchers",
          "Invoice"
        ),
        done(
          "rev",
          "REV • RECEIVABLE VOUCHER",
          "/finance/revenue-vouchers",
          "Receivable Voucher"
        ),
        done(
          "petty-cash",
          "PCV • PETTY CASH",
          "/finance/petty-cash-vouchers",
          "Petty Cash"
        ),
        done(
          "collector-pickup-settlement",
          "COL • COLLECTOR PICKUP / PAY-IN DEPOSIT",
          "/finance/pos-settlement/collector-pickup",
          "Collector settlement"
        ),
      ],
    },
    dashboard: {
      label: "Dashboard",
      description:
        "View accounting results — read-only GL and financial statements from posted journals.",
      href: hubHref("dashboard"),
      items: [
        done(
          "general-ledger",
          "General Ledger",
          "/finance/reports/general-ledger",
          "One account — opening balance, movements, closing balance"
        ),
        done(
          "trial-balance",
          "Trial Balance",
          "/finance/reports/trial-balance",
          "All accounts — period debit and credit totals"
        ),
        done(
          "profit-loss",
          "Profit & Loss",
          "/finance/reports/profit-loss",
          "Income statement from revenue and expense activity"
        ),
        done(
          "balance-sheet",
          "Balance Sheet",
          "/finance/reports/balance-sheet",
          "Assets, liabilities, and equity from posted journals"
        ),
      ],
    },
    "accounting-periods": {
      label: "Month-End Closing",
      description:
        "Reconciliation, close readiness, accounting period management, and month-end closing workflow.",
      href: "/finance/accounting-periods",
      items: [],
      itemGroups: [
        {
          key: "reconciliation-close",
          label: "Reconciliation / Close",
          items: [
            done(
              "operational-reconciliation",
              "Operational Reconciliation",
              "/finance/reconciliation",
              "Read-only operational vs GL comparison"
            ),
            done(
              "bank-reconciliation",
              "Bank Reconciliation",
              "/finance/reconciliation/bank",
              "Period bank worksheet for configured bank GL accounts"
            ),
            done(
              "cash-reconciliation",
              "Cash Reconciliation",
              "/finance/reconciliation/cash",
              "Branch cash count worksheet for configured cash GL accounts"
            ),
            done(
              "close-readiness",
              "Close Readiness",
              "/finance/periods",
              "Select a period to review close readiness, perform soft/hard close and reopen, view timeline, and export audit evidence."
            ),
          ],
        },
      ],
    },
    audit: {
      label: "Audit",
      description:
        "Trace and verify documents — voucher inquiry, lineage, and attachments.",
      href: hubHref("audit"),
      items: [
        done(
          "voucher-lookup",
          "Finance Document Inquiry",
          "/finance/vouchers",
          "Search, inspect, print and audit finance documents across vouchers and operational workflows."
        ),
        done(
          "stock-document-inquiry",
          "Stock Document Inquiry",
          "/finance/stock-documents",
          "Search and audit stock documents — CNT, ADJ, ORD, DEY, ORS, ORI — with posting and finance linkage."
        ),
        done(
          "document-trace",
          "Document Trace",
          "/finance/audit/document-trace",
          "Lineage from business document through voucher to ledger"
        ),
        comingSoon(
          "attachments",
          "Attachments",
          "Evidence and supporting files linked to finance documents"
        ),
      ],
    },
  }
}

/** Admin hub — routes remain valid; not shown on F0.2 Finance home. */
function buildLegacySystemHub(): Omit<FinanceMenuHub, "key"> {
  return {
    label: "System",
    description: "Chart of accounts and imports",
    href: hubHref("system"),
    items: [
      {
        key: "chart-of-accounts",
        label: "Chart of Accounts",
        href: "/finance/accounts",
        hint: "Browse, export, and import GL accounts",
        status: "available",
      },
      {
        key: "chart-of-accounts-import",
        label: "Import Chart of Accounts",
        href: "/finance/accounts/import",
        hint: "CSV preview and apply for GL account updates",
        status: "available",
      },
    ],
  }
}

const FINANCE_MENU_HUBS = buildPrimaryFinanceMenuHubs()
const FINANCE_LEGACY_SYSTEM_HUB = buildLegacySystemHub()

function flattenHubItems(hub: Omit<FinanceMenuHub, "key">): FinanceMenuItem[] {
  if (hub.itemGroups?.length) {
    return hub.itemGroups.flatMap((group) => group.items)
  }
  return hub.items
}

export function canAccessFinanceMenu(role: Role): boolean {
  return (
    role !== "SH_STAFF" &&
    canAccessMenu(role, "finance") &&
    role !== "HO_OPERATIONS"
  )
}

export function isFinanceMenuHubKey(value: string): value is FinanceMenuHubKey {
  return (FINANCE_MENU_HUB_ORDER as readonly string[]).includes(value)
}

export function isFinanceMenuAnyHubKey(
  value: string
): value is FinanceMenuAnyHubKey {
  return (
    isFinanceMenuHubKey(value) ||
    value === "transactions" ||
    value === "ledger" ||
    value === "reports" ||
    value === "system"
  )
}

/** Top-level Finance home cards — Daily Work, Dashboard, Audit. */
export function getFinanceMenuHomeSections(role: Role): FinanceMenuItem[] {
  if (!canAccessFinanceMenu(role)) return []

  return FINANCE_MENU_HUB_ORDER.map((key) => {
    const hub = FINANCE_MENU_HUBS[key]
    return {
      key,
      label: hub.label,
      href: hub.href,
      hint: hub.description,
      status: "available" as const,
    }
  })
}

export function getFinanceMenuHub(
  role: Role,
  hubKey: FinanceMenuAnyHubKey
): FinanceMenuHub | null {
  if (!canAccessFinanceMenu(role)) return null

  if (hubKey === "system") {
    return { key: "system", ...FINANCE_LEGACY_SYSTEM_HUB }
  }

  if (hubKey === "transactions") {
    return getFinanceMenuHub(role, "daily-work")
  }

  if (hubKey === "ledger" || hubKey === "reports") {
    return getFinanceMenuHub(role, "dashboard")
  }

  if (!isFinanceMenuHubKey(hubKey)) {
    return null
  }

  const hub = FINANCE_MENU_HUBS[hubKey]
  return {
    key: hubKey,
    label: hub.label,
    description: hub.description,
    href: hub.href,
    items: hub.items,
    itemGroups: hub.itemGroups,
  }
}

/** Flat list of F0.2 finance menu leaf items for diagnostics and main-menu item lookup. */
export function getAllFinanceMenuItems(role: Role): FinanceMenuItem[] {
  if (!canAccessFinanceMenu(role)) return []

  return FINANCE_MENU_HUB_ORDER.flatMap((key) =>
    flattenHubItems(FINANCE_MENU_HUBS[key])
  )
}

export const FINANCE_MENU_HOME_DESCRIPTION =
  "Daily Work — create and process finance documents. Dashboard — view GL and financial statements. Month-End Closing — reconciliation, close readiness, and period administration. Audit — trace and verify documents."
