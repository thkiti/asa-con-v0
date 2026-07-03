import { canAccessMenu } from "@/lib/permissions/menu"
import {
  canAccessMasterDatabase,
  canAccessProductReference,
} from "@/lib/permissions/master"
import { canAccessShopSalesDashboard } from "@/lib/permissions/sales-dashboard"
import { getAllFinanceMenuItems, canAccessFinanceMenu } from "@/lib/main-ui/finance-menu"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
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
      "Daily Work, Dashboard, Accounting Periods, and Audit — see /finance for the F0.2 menu",
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

function sectionHref(key: MainMenuSectionKey): string {
  if (key === "administration") {
    return "/master"
  }
  if (key === "finance") {
    return "/finance"
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
      return canAccessMenu(role, "system") || canAccessFinanceMenu(role)
    default:
      return false
  }
}

function buildSectionItems(
  role: Role,
  key: MainMenuSectionKey,
  documentEntityCode: DocumentEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE
): MainMenuItem[] {
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
      return getAllFinanceMenuItems(role)

    case "operations":
      if (!canAccessMenu(role, "operations")) return []
      return [
        ...(canAccessProductReference(role) && role === "HO_OPERATIONS"
          ? [
              available(
                "product-reference-stock",
                "Product & Reference Stock",
                "/master/product-reference",
                "Product, category, brand, unit, barcode and stock reference setup"
              ),
            ]
          : []),
        available(
          "check-receipt",
          "Check Receipt",
          "/operations/check-receipt",
          "Review receipts and bank-transfer slips by shop and month"
        ),
        available(
          "receipt-lookup",
          "Receipt Lookup",
          "/shop/receipt-lookup",
          "Search archived receipt PDFs by number and date"
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
        ...(canAccessShopSalesDashboard(documentEntityCode)
          ? [
              available(
                "target-sales",
                "Last Month / Actual Sales",
                "/shop/target-sales",
                "Compare last month and actual gross sales by day (All Company or branch)"
              ),
            ]
          : []),
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
      if (canAccessFinanceMenu(role)) {
        items.push(
          available(
            "import-accounting",
            "Import Accounting Data",
            "/finance/system",
            "Chart of accounts and finance setup imports"
          )
        )
      }
      items.push(
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
  key: MainMenuSectionKey,
  documentEntityCode: DocumentEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE
): MainMenuSectionDetail | null {
  if (!canAccessMainMenuSection(role, key)) {
    return null
  }

  return {
    ...toSection(key),
    items: buildSectionItems(role, key, documentEntityCode),
  }
}

export function isMainMenuSectionKey(value: string): value is MainMenuSectionKey {
  return (MAIN_MENU_SECTION_ORDER as readonly string[]).includes(value)
}

/** @deprecated Use getMainMenuSectionDetail — kept for transitional tests/diagnostics. */
export function getMainMenuGroups(
  role: Role,
  documentEntityCode: DocumentEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE
): MainMenuGroup[] {
  return getMainMenuSections(role).map((section) => ({
    key: section.key,
    label: section.label,
    items: buildSectionItems(role, section.key, documentEntityCode),
  }))
}

/** Flat list of all menu entries (available + planned) for tests and diagnostics. */
export function getMainMenuItems(
  role: Role,
  documentEntityCode: DocumentEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE
): MainMenuItem[] {
  return getMainMenuSections(role).flatMap((section) =>
    buildSectionItems(role, section.key, documentEntityCode)
  )
}
