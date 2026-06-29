import { canAccessMenu } from "@/lib/permissions/menu"
import type { Role } from "@/lib/shared"

/**
 * Finance menu — F0.2 locked information architecture.
 *
 * Document layer (Daily Work): MJV, PAV, INV, REV, Petty Cash
 * Reporting layer (Dashboard): GL, TB, P&L, BS
 * Audit layer (Audit): Voucher Lookup, Document Trace, Attachments
 *
 * No separate Ledger, Transactions, JV, APV, ACC, or Receivables groups.
 * See docs/FINANCE_TRANSACTION_UNIVERSE.md for business direction.
 */

/** Primary F0.2 finance navigation hubs (locked). */
export type FinanceMenuHubKey = "daily-work" | "dashboard" | "audit"

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
          "MJV",
          "/finance/manual-journal-entries",
          "Manual journal vouchers — MJV, OPB, adjustments, accruals, corrections"
        ),
        done(
          "pav",
          "PAV",
          "/finance/payment-vouchers",
          "Outbound payments, cheques, and settlement disbursements"
        ),
        done(
          "inv",
          "INV",
          "/finance/invoice-vouchers",
          "Finance invoices — bill receivables before payment (not POS sales invoice)"
        ),
        done(
          "rev",
          "REV",
          "/finance/revenue-vouchers",
          "Inbound receipts — receive to bank or cash, allocate credits, post to GL"
        ),
        done(
          "petty-cash",
          "Petty Cash",
          "/finance/petty-cash-vouchers",
          "Small cash disbursements and replenishment (PCV)"
        ),
        done(
          "collector-pickup-settlement",
          "Collector Pickup Settlement",
          "/finance/pos-settlement/collector-pickup",
          "Review collector tickets, PAY-IN slip evidence, and post bank deposit"
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
    audit: {
      label: "Audit",
      description:
        "Trace and verify documents — voucher inquiry, lineage, and attachments.",
      href: hubHref("audit"),
      items: [
        done(
          "voucher-lookup",
          "Voucher / Journal Inquiry",
          "/finance/vouchers",
          "Search posted vouchers and journal lines from any source"
        ),
        comingSoon(
          "document-trace",
          "Document Trace",
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
    description: "Chart of accounts, imports, and accounting periods",
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
      {
        key: "accounting-periods",
        label: "Accounting Periods",
        href: "/finance/periods",
        hint: "Period lifecycle, close evidence, and reopen workflow",
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
  "Daily Work — create and process finance documents. Dashboard — view GL and financial statements. Audit — trace and verify (coming soon)."
