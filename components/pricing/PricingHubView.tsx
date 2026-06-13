import { MainMenuHubPage } from "@/components/main/MainMenuHubPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuCardItem } from "@/lib/main-ui/main-menu-card-types"

const PRICING_ENTRIES = [
  {
    key: "pricing-policy",
    href: "/master/pricing/policy",
    label: "Pricing Policy",
    hint: "HO → SHOP markup % and rounding rules for transfer pricing.",
    status: "available" as const,
  },
  {
    key: "selling-price",
    href: "/master/pricing/selling-price",
    label: "Selling Price",
    hint: "Global retail price — set by item or by reference group.",
    status: "available" as const,
  },
  {
    key: "promotion-price",
    label: "Promotion Price",
    hint: "Temporary promotional retail (planned). Does not overwrite selling price.",
    status: "planned" as const,
  },
] satisfies readonly MainMenuCardItem[]

type PricingHubViewProps = {
  user: SessionUserApi
}

export function PricingHubView({ user }: PricingHubViewProps) {
  return (
    <MainMenuHubPage
      user={user}
      title="PRICING"
      backHref="/master"
      backLabel="← ADMINISTRATION"
      description="Transfer policy, retail selling prices, and future promotion pricing."
      gridAriaLabel="Pricing maintenance"
      items={PRICING_ENTRIES}
    />
  )
}
