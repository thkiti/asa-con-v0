import Link from "next/link"
import {
  formatEntityContextTitleOrDefault,
  type DocumentEntityCode,
} from "@/lib/legal-entity"
import {
  mainMenuCardHintClass,
  mainMenuCardTitleClass,
} from "@/lib/main-ui/main-menu-layout"
import {
  themeMenuCard,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

const PRICING_ENTRIES = [
  {
    href: "/master/pricing/policy",
    title: "Pricing Policy",
    hint: "HO → SHOP markup % and rounding rules for transfer pricing.",
    available: true,
  },
  {
    href: "/master/pricing/selling-price",
    title: "Selling Price",
    hint: "Global retail price — set by item or by reference group.",
    available: true,
  },
  {
    href: "",
    title: "Promotion Price",
    hint: "Temporary promotional retail (planned). Does not overwrite selling price.",
    available: false,
  },
] as const

type PricingHubViewProps = {
  documentEntityCode: DocumentEntityCode
}

export function PricingHubView({ documentEntityCode }: PricingHubViewProps) {
  const displayTitle = formatEntityContextTitleOrDefault(
    documentEntityCode,
    "Pricing"
  )

  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        <Link
          href="/master"
          className={`text-sm ${themeMuted} underline hover:text-foreground`}
        >
          ← ADMINISTRATION
        </Link>
        <h1
          className={`mt-3 ${themePageTitle}`}
          data-testid="entity-context-page-title"
        >
          {displayTitle}
        </h1>
        <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>
          Transfer policy, retail selling prices, and future promotion pricing.
        </p>
      </header>

      <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Pricing maintenance">
        {PRICING_ENTRIES.map((entry) =>
          entry.available ? (
            <Link
              key={entry.href}
              href={entry.href}
              className={`${themeMenuCard} block p-4`}
            >
              <span className={mainMenuCardTitleClass}>{entry.title}</span>
              <span className={`mt-1 block ${mainMenuCardHintClass}`}>{entry.hint}</span>
            </Link>
          ) : (
            <div
              key={entry.title}
              className={`${themeMenuCard} block cursor-not-allowed p-4 opacity-60`}
              aria-disabled
            >
              <span className={mainMenuCardTitleClass}>{entry.title}</span>
              <span className={`mt-1 block ${mainMenuCardHintClass}`}>{entry.hint}</span>
            </div>
          )
        )}
      </nav>
    </main>
  )
}
