import Link from "next/link"
import { MainMenuHubPage } from "@/components/main/MainMenuHubPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { mainMenuDescriptionLinkClass } from "@/lib/main-ui/main-menu-layout"

const ADMINISTRATION_ENTRIES = [
  {
    href: "/master/product-reference",
    title: "Product & Reference Stock",
    hint: "Search product and hook reference links; view product with reference stock together.",
  },
  {
    href: "/master/branch",
    title: "Branch",
    hint: "List branches by code or name; active and deleted status.",
  },
  {
    href: "/master/staff",
    title: "Staff",
    hint: "List staff by ID or name; role, branch, active and deleted status.",
  },
  {
    href: "/master/pricing",
    title: "Pricing",
    hint: "HO transfer policy, global retail selling price, promotion (planned).",
  },
  {
    href: "/admin/receipt-setup",
    title: "Receipt Setup",
    hint: "Receipt company name, footer lines, and Thai tax invoice labels.",
  },
] as const

type MasterHubViewProps = {
  user: SessionUserApi
}

export function MasterHubView({ user }: MasterHubViewProps) {
  return (
    <MainMenuHubPage
      user={user}
      title="ADMINISTRATION"
      backHref="/main"
      backLabel="← Back to Main Menu"
      description={
        <>
          Maintenance for product master, branches, staff, pricing, and POS receipt layout.
          Bulk load from legacy files remains under{" "}
          <Link href="/system/import" className={mainMenuDescriptionLinkClass}>
            System Import
          </Link>
          .
        </>
      }
      gridAriaLabel="Administration"
      items={ADMINISTRATION_ENTRIES.map((entry) => ({
        key: entry.href,
        label: entry.title,
        hint: entry.hint,
        href: entry.href,
        status: "available" as const,
      }))}
    />
  )
}
