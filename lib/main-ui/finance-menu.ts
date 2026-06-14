import { canAccessMenu } from "@/lib/permissions/menu"
import type { Role } from "@/lib/shared"

export type FinanceMenuHubKey = "daily-work" | "reports" | "audit" | "system"

export type FinanceMenuItemStatus = "available" | "planned"

export type FinanceMenuItem = {
  key: string
  label: string
  hint?: string
  href?: string
  status: FinanceMenuItemStatus
}

export type FinanceMenuHub = {
  key: FinanceMenuHubKey
  label: string
  description: string
  href: string
  items: FinanceMenuItem[]
}

const FINANCE_MENU_HUB_ORDER: readonly FinanceMenuHubKey[] = [
  "daily-work",
  "reports",
  "audit",
  "system",
] as const

function available(
  key: string,
  label: string,
  href: string,
  hint?: string
): FinanceMenuItem {
  return { key, label, href, hint, status: "available" }
}

function hubHref(key: FinanceMenuHubKey): string {
  return `/finance/${key}`
}

function buildFinanceMenuHubs(): Record<FinanceMenuHubKey, Omit<FinanceMenuHub, "key">> {
  return {
    "daily-work": {
      label: "Daily Work",
      description: "Opening balance, journal entry workflow, and instant GL posting",
      href: hubHref("daily-work"),
      items: [
        available(
          "opening-balance",
          "Opening Balance",
          "/finance/opening-balance",
          "Create and post OPB opening balance journals (balance-sheet accounts)"
        ),
        available(
          "manual-journal-entries",
          "Journal Entry Workflow",
          "/finance/manual-journal-entries",
          "Draft, submit, confirm, and post operational journal entries"
        ),
        available(
          "manual-journal",
          "Instant GL Journal",
          "/finance/journal-entries",
          "Post balanced GL journals immediately (16B)"
        ),
      ],
    },
    reports: {
      label: "Reports",
      description: "Read-only financial statements and ledger reports",
      href: hubHref("reports"),
      items: [
        available(
          "trial-balance",
          "Trial Balance",
          "/finance/reports/trial-balance",
          "GL trial balance integrity report"
        ),
        available(
          "general-ledger",
          "General Ledger",
          "/finance/reports/general-ledger",
          "Account ledger with opening, activity, and closing balances"
        ),
        available(
          "profit-loss",
          "Profit & Loss",
          "/finance/reports/profit-loss",
          "Period income statement from revenue and expense activity"
        ),
        available(
          "balance-sheet",
          "Balance Sheet",
          "/finance/reports/balance-sheet",
          "Assets, liabilities, and equity from posted journal activity"
        ),
        available(
          "changes-in-equity",
          "Changes in Equity",
          "/finance/reports/changes-in-equity",
          "Equity movement matrix — opening, profit, other changes, closing"
        ),
        available(
          "retained-earnings",
          "Retained Earnings",
          "/finance/reports/retained-earnings",
          "Posted account 301 plus net income — economic equity before close"
        ),
      ],
    },
    audit: {
      label: "Audit",
      description: "Reconciliation workspace, variance review, and snapshots",
      href: hubHref("audit"),
      items: [
        available(
          "reconciliation-dashboard",
          "Reconciliation Workspace",
          "/finance/reconciliation",
          "Operational vs GL variance overview"
        ),
        available(
          "reconciliation-sales",
          "Sales Reconciliation",
          "/finance/reconciliation/sales",
          "POS sales vs revenue and tender accounts"
        ),
        available(
          "reconciliation-inventory",
          "Inventory Reconciliation",
          "/finance/reconciliation/inventory",
          "Stock ledger vs inventory GL"
        ),
        available(
          "reconciliation-snapshots",
          "Reconciliation Snapshots",
          "/finance/reconciliation/snapshots",
          "Frozen reconciliation history and compare"
        ),
      ],
    },
    system: {
      label: "System",
      description: "Chart of accounts, imports, and accounting periods",
      href: hubHref("system"),
      items: [
        available(
          "chart-of-accounts",
          "Chart of Accounts",
          "/finance/accounts",
          "Browse, export, and import GL accounts"
        ),
        available(
          "chart-of-accounts-import",
          "Import Chart of Accounts",
          "/finance/accounts/import",
          "CSV preview and apply for GL account updates"
        ),
        available(
          "accounting-periods",
          "Accounting Periods",
          "/finance/periods",
          "Period lifecycle, close evidence, and reopen workflow"
        ),
      ],
    },
  }
}

const FINANCE_MENU_HUBS = buildFinanceMenuHubs()

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

/** Top-level Finance home cards — one per hub. */
export function getFinanceMenuHomeSections(role: Role): FinanceMenuItem[] {
  if (!canAccessFinanceMenu(role)) return []

  return FINANCE_MENU_HUB_ORDER.map((key) => {
    const hub = FINANCE_MENU_HUBS[key]
    return available(key, hub.label, hub.href, hub.description)
  })
}

export function getFinanceMenuHub(
  role: Role,
  hubKey: FinanceMenuHubKey
): FinanceMenuHub | null {
  if (!canAccessFinanceMenu(role)) return null

  const hub = FINANCE_MENU_HUBS[hubKey]
  return {
    key: hubKey,
    label: hub.label,
    description: hub.description,
    href: hub.href,
    items: hub.items,
  }
}

/** Flat list of all finance leaf links for diagnostics and main-menu item lookup. */
export function getAllFinanceMenuItems(role: Role): FinanceMenuItem[] {
  if (!canAccessFinanceMenu(role)) return []

  return FINANCE_MENU_HUB_ORDER.flatMap((key) => FINANCE_MENU_HUBS[key].items)
}

export const FINANCE_MENU_HOME_DESCRIPTION =
  "Finance operations, reports, reconciliation, and period management"
