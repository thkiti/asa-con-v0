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

export type MainMenuGroup = {
  key: string
  label: string
  items: MainMenuItem[]
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

/** Domain-grouped main menu for `/main` — visibility uses existing menu/area guards. */
export function getMainMenuGroups(role: Role): MainMenuGroup[] {
  const groups: MainMenuGroup[] = []

  const financeItems: MainMenuItem[] = []
  if (canAccessMenu(role, "finance")) {
    financeItems.push(
      available(
        "finance",
        "Finance",
        "/finance",
        "Periods, reconciliation, vouchers"
      )
    )
  }
  if (financeItems.length > 0) {
    groups.push({ key: "finance", label: "Finance", items: financeItems })
  }

  const stockItems: MainMenuItem[] = []
  if (canAccessMenu(role, "shop")) {
    stockItems.push(
      available(
        "stock-documents",
        "Stock Documents",
        "/shop/stock-documents",
        "Transfers, performance, adjustments"
      )
    )
  }
  stockItems.push(
    planned("stock-card", "Stock Card"),
    planned("stock-movement", "Stock Movement"),
    planned("stock-reports", "Stock Reports")
  )
  groups.push({ key: "stock", label: "Stock", items: stockItems })

  if (canAccessMasterDatabase(role)) {
    groups.push({
      key: "master-database",
      label: "Master Database",
      items: [
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
      ],
    })
  }

  const systemItems: MainMenuItem[] = []
  if (canAccessMenu(role, "system")) {
    systemItems.push(
      available(
        "system-import",
        "System Import",
        "/system/import",
        "Import master database"
      )
    )
  }
  systemItems.push(
    planned("import-accounting", "Import Accounting Data"),
    planned("settings-maintenance", "Settings / Maintenance")
  )
  groups.push({ key: "system", label: "System", items: systemItems })

  return groups
}

/** Flat list of all menu entries (available + planned) for tests and diagnostics. */
export function getMainMenuItems(role: Role): MainMenuItem[] {
  return getMainMenuGroups(role).flatMap((group) => group.items)
}
