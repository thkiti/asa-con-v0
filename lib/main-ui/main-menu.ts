import { canAccessMenu } from "@/lib/permissions/menu"
import { canAccessMasterDatabase } from "@/lib/permissions/master"
import type { Role } from "@/lib/shared"

export type MainMenuItemStatus = "available" | "planned"

export type MainMenuItem = {
  key: string
  label: string
  hint?: string
  href?: string
  status: MainMenuItemStatus
}

export type MainMenuSectionKey =
  | "administration"
  | "finance"
  | "operations"
  | "shop"
  | "system"

export type MainMenuSection = {
  key: MainMenuSectionKey
  label: string
  description: string
  href: string
}

export type MainMenuSectionItemGroup = {
  key: string
  label: string
  items: MainMenuItem[]
}

export type MainMenuSectionDetail = MainMenuSection & {
  items: MainMenuItem[]
  /** When set, hub renders labeled card grids instead of one flat grid. */
  itemGroups?: MainMenuSectionItemGroup[]
}

export type MainMenuGroup = {
  key: string
  label: string
  items: MainMenuItem[]
}

const MAIN_MENU_SECTION_ORDER: readonly MainMenuSectionKey[] = [
  "administration",
  "finance",
  "operations",
  "shop",
  "system",
] as const

const SECTION_META: Record<
  MainMenuSectionKey,
  Pick<MainMenuSection, "label" | "description">
> = {
  administration: {
    label: "ADMINISTRATION",
    description: "Product, branch, staff, pricing, and receipt setup",
  },
  finance: {
    label: "FINANCE",
    description:
      "Reports, operations, reconciliation, and period management",
  },
  operations: {
    label: "OPERATIONS",
    description: "Stock Documents, Stock Card, Stock Movement, Supplier Order",
  },
  shop: {
    label: "SHOP",
    description: "Sales, shop stock, daily closing, monthly closing, worktime",
  },
  system: {
    label: "SYSTEM",
    description:
      "Import Master Database, Import Accounting Data, Settings, Maintenance",
  },
}

function available(
  key: string,
  label: string,
  href: string,
  hint?: string
): MainMenuItem {
  return { key, label, href, hint, status: "available" }
}

function planned(key: string, label: string, hint?: string): MainMenuItem {
  return { key, label, hint, status: "planned" }
}

function buildFinanceItemGroups(role: Role): MainMenuSectionItemGroup[] {
  if (!canAccessMenu(role, "finance")) return []

  return [
    {
      key: "reports",
      label: "Reports",
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
          "cash-flow",
          "Cash Flow",
          "/finance/reports/cash-flow",
          "Indirect cash flow statement with cash reconciliation"
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
          "retained-earnings",
          "Retained Earnings",
          "/finance/reports/retained-earnings",
          "Posted account 301 plus net income — economic equity before close"
        ),
        available(
          "changes-in-equity",
          "Changes in Equity",
          "/finance/reports/changes-in-equity",
          "Equity movement matrix — opening, profit, other changes, closing"
        ),
      ],
    },
    {
      key: "operations",
      label: "Operations",
      items: [
        available(
          "manual-journal",
          "Instant GL Journal",
          "/finance/journal-entries",
          "Post balanced GL journals immediately (16B)"
        ),
        available(
          "manual-journal-entries",
          "Journal Entry Workflow",
          "/finance/manual-journal-entries",
          "Draft, submit, confirm, and post operational journal entries"
        ),
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
      ],
    },
    {
      key: "reconciliation",
      label: "Reconciliation",
      items: [
        available(
          "reconciliation-dashboard",
          "Reconciliation Dashboard",
          "/finance/reconciliation",
          "Operational vs GL variance overview"
        ),
        available(
          "reconciliation-inventory",
          "Inventory Reconciliation",
          "/finance/reconciliation/inventory",
          "Stock ledger vs inventory GL"
        ),
        available(
          "reconciliation-sales",
          "Sales Reconciliation",
          "/finance/reconciliation/sales",
          "POS sales vs revenue and tender accounts"
        ),
        available(
          "reconciliation-refunds",
          "Refund Reconciliation",
          "/finance/reconciliation/refunds",
          "Refund activity vs GL reversals"
        ),
        available(
          "reconciliation-snapshots",
          "Reconciliation Snapshots",
          "/finance/reconciliation/snapshots",
          "Frozen reconciliation history and compare"
        ),
      ],
    },
    {
      key: "period-management",
      label: "Period Management",
      items: [
        available(
          "accounting-periods",
          "Accounting Periods",
          "/finance/periods",
          "Period lifecycle, close evidence, and reopen workflow"
        ),
      ],
    },
    {
      key: "planned",
      label: "Planned",
      items: [
        planned("transfer-list", "Transfer List"),
        planned("receivable", "Receivable"),
        planned("reports", "Reports"),
      ],
    },
  ]
}

function sectionHref(key: MainMenuSectionKey): string {
  if (key === "administration") {
    return "/master"
  }
  return `/main/${key}`
}

/** HO Control Center only — branch staff use the branch working screen instead. */
export function isHoMainMenuRole(role: Role): boolean {
  return role !== "SH_STAFF"
}

export function canAccessMainMenuSection(
  role: Role,
  key: MainMenuSectionKey
): boolean {
  if (!isHoMainMenuRole(role)) {
    return false
  }

  switch (key) {
    case "administration":
      return canAccessMasterDatabase(role)
    case "finance":
      return (
        isHoMainMenuRole(role) &&
        canAccessMenu(role, "finance") &&
        role !== "HO_OPERATIONS"
      )
    case "operations":
      return canAccessMenu(role, "operations")
    case "shop":
      return canAccessMenu(role, "shop")
    case "system":
      return canAccessMenu(role, "system")
    default:
      return false
  }
}

function buildSectionItems(role: Role, key: MainMenuSectionKey): MainMenuItem[] {
  switch (key) {
    case "administration":
      if (!canAccessMasterDatabase(role)) return []
      return [
        available(
          "product-reference-stock",
          "Product / Reference Stock",
          "/master/product-reference",
          "Search product and hook reference links"
        ),
        available(
          "branch",
          "Branch",
          "/master/branch",
          "Branch codes, types, active status"
        ),
        available(
          "staff",
          "Staff",
          "/master/staff",
          "Staff accounts, roles, branch assignment"
        ),
        available(
          "pricing",
          "Pricing",
          "/master/pricing",
          "Transfer policy, selling price, promotion (planned)"
        ),
        available(
          "receipt-setup",
          "Receipt Setup",
          "/admin/receipt-setup",
          "Receipt company name, footer lines, Thai tax labels"
        ),
      ]

    case "finance":
      return buildFinanceItemGroups(role).flatMap((group) => group.items)

    case "operations":
      if (!canAccessMenu(role, "operations")) return []
      return [
        available(
          "check-receipt",
          "Check Receipt",
          "/operations/check-receipt",
          "Review receipts and bank-transfer slips by shop and month"
        ),
        available(
          "catalog-image",
          "Catalog Image",
          "/operations/catalog-image",
          "Crop catalog PDFs, match products, upload images"
        ),
        available(
          "stock-documents",
          "Stock Documents",
          "/shop/stock-documents",
          "Transfers, performance, adjustments"
        ),
        planned("stock-card", "Stock Card"),
        planned("stock-movement", "Stock Movement"),
        planned("supplier-order", "Supplier Order"),
      ]

    case "shop":
      if (!canAccessMenu(role, "shop") || !isHoMainMenuRole(role)) return []
      return [
        available(
          "sales-target-setup",
          "Sales Target Setup",
          "/shop/sales-targets",
          "Set monthly sales targets per branch (Mon–Sun pattern)"
        ),
        available(
          "target-sales",
          "Target / Sales",
          "/shop/target-sales",
          "Monthly target vs gross sales by day (All Company or branch)"
        ),
        planned("shop-stock", "Shop stock"),
        planned("daily-closing", "Daily closing"),
        planned("monthly-closing", "Monthly closing"),
        planned("worktime", "Worktime"),
      ]

    case "system": {
      const items: MainMenuItem[] = []
      if (canAccessMenu(role, "system")) {
        items.push(
          available(
            "import-master-database",
            "Import Master Database",
            "/system/import",
            "Bulk load master database from legacy files"
          )
        )
      }
      items.push(
        planned("import-accounting", "Import Accounting Data"),
        planned("settings", "Settings"),
        planned("maintenance", "Maintenance")
      )
      return items
    }

    default:
      return []
  }
}

function toSection(key: MainMenuSectionKey): MainMenuSection {
  const meta = SECTION_META[key]
  return {
    key,
    label: meta.label,
    description: meta.description,
    href: sectionHref(key),
  }
}

/** Top-level HO Control Center cards for `/main`. */
export function getMainMenuSections(role: Role): MainMenuSection[] {
  return MAIN_MENU_SECTION_ORDER.filter((key) =>
    canAccessMainMenuSection(role, key)
  ).map((key) => toSection(key))
}

/** Detail menu for `/main/{section}` — null when role may not open the section. */
export function getMainMenuSectionDetail(
  role: Role,
  key: MainMenuSectionKey
): MainMenuSectionDetail | null {
  if (!canAccessMainMenuSection(role, key)) {
    return null
  }

  const itemGroups = key === "finance" ? buildFinanceItemGroups(role) : undefined

  return {
    ...toSection(key),
    items: itemGroups
      ? itemGroups.flatMap((group) => group.items)
      : buildSectionItems(role, key),
    ...(itemGroups && itemGroups.length > 0 ? { itemGroups } : {}),
  }
}

export function isMainMenuSectionKey(value: string): value is MainMenuSectionKey {
  return (MAIN_MENU_SECTION_ORDER as readonly string[]).includes(value)
}

/** @deprecated Use getMainMenuSectionDetail — kept for transitional tests/diagnostics. */
export function getMainMenuGroups(role: Role): MainMenuGroup[] {
  return getMainMenuSections(role).map((section) => ({
    key: section.key,
    label: section.label,
    items: buildSectionItems(role, section.key),
  }))
}

/** Flat list of all menu entries (available + planned) for tests and diagnostics. */
export function getMainMenuItems(role: Role): MainMenuItem[] {
  return getMainMenuSections(role).flatMap((section) =>
    buildSectionItems(role, section.key)
  )
}
