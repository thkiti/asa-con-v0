import { canAccessMenu } from "@/lib/permissions/menu"
import type { Role } from "@/lib/shared"

/** Primary F0 finance navigation hubs. */
export type FinanceMenuHubKey = "dashboard" | "transactions" | "ledger" | "audit"

/** Legacy hub routes kept for bookmarks and admin surfaces — not on the F0 home menu. */
export type FinanceMenuLegacyHubKey = "daily-work" | "reports" | "system"

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
  "dashboard",
  "transactions",
  "ledger",
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
    dashboard: {
      label: "Dashboard",
      description:
        "Finance Core is operational — MJV → Posting → Voucher → GL → Trial Balance → P&L → Balance Sheet. Future work: PAY, REV, and audit traceability.",
      href: hubHref("dashboard"),
      items: [
        done(
          "mjv",
          "MJV",
          "/finance/manual-journal-entries",
          "Manual journal vouchers — OPB, MAJ, adjustments, accruals, and other accounting entries"
        ),
        done(
          "trial-balance",
          "Trial Balance",
          "/finance/reports/trial-balance",
          "Period integrity across all GL accounts"
        ),
        done(
          "general-ledger",
          "General Ledger",
          "/finance/reports/general-ledger",
          "Account-level posted journal drill-down"
        ),
      ],
    },
    transactions: {
      label: "Transactions",
      description:
        "Business documents on top of the accounting engine — not separate GL engines.",
      href: hubHref("transactions"),
      items: [],
      itemGroups: [
        {
          key: "mjv",
          label: "Accounting",
          items: [
            done(
              "mjv",
              "MJV",
              "/finance/manual-journal-entries",
              "Central manual journal voucher workflow — opening balance, manual journals, adjustments, accruals, corrections"
            ),
          ],
        },
        {
          key: "pay",
          label: "PAY",
          items: [
            comingSoon(
              "pay-register",
              "Payment Register",
              "Outbound payments, cheques, and settlement disbursements"
            ),
            comingSoon(
              "pay-evidence",
              "Payment Evidence",
              "Supporting files and evidence for payments"
            ),
          ],
        },
        {
          key: "rev",
          label: "REV",
          items: [
            comingSoon(
              "rev-settlement",
              "Settlement",
              "Receivable settlements — mall, partner, and third-party amounts owed"
            ),
            comingSoon(
              "rev-aging",
              "AR Aging",
              "Receivable aging and collection tracking"
            ),
          ],
        },
      ],
    },
    ledger: {
      label: "Ledger",
      description: "Read-only reports from posted general ledger activity.",
      href: hubHref("ledger"),
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
        "Voucher lookup, document trace, and attachments — consolidated audit navigation (in progress).",
      href: hubHref("audit"),
      items: [
        comingSoon(
          "voucher-lookup",
          "Voucher Lookup",
          "Search posted vouchers and journal references"
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

/** Admin / legacy hub — routes remain valid; not shown on F0 Finance home. */
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
    value === "daily-work" ||
    value === "reports" ||
    value === "system"
  )
}

/** Top-level Finance home cards — Dashboard, Transactions, Ledger, Audit. */
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

  if (hubKey === "daily-work") {
    return getFinanceMenuHub(role, "transactions")
  }

  if (hubKey === "reports") {
    return getFinanceMenuHub(role, "ledger")
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

/** Flat list of F0 finance menu leaf items for diagnostics and main-menu item lookup. */
export function getAllFinanceMenuItems(role: Role): FinanceMenuItem[] {
  if (!canAccessFinanceMenu(role)) return []

  const primary = FINANCE_MENU_HUB_ORDER.flatMap((key) =>
    flattenHubItems(FINANCE_MENU_HUBS[key])
  )

  // Deduplicate by key (dashboard and transactions both expose mjv)
  const seen = new Set<string>()
  return primary.filter((item) => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

export const FINANCE_MENU_HOME_DESCRIPTION =
  "Finance Core is operational. Use Transactions for MJV; Ledger for GL and statements; PAY and REV coming soon."
