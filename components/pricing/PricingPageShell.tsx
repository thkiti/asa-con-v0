import Link from "next/link"
import type { ReactNode } from "react"
import {
  themeLinkMuted,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

type PricingPageShellProps = {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function PricingPageShell({
  title,
  description,
  backHref = "/master/pricing",
  backLabel = "← Pricing",
  children,
}: PricingPageShellProps) {
  return (
    <main className={`mx-auto max-w-6xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        {backHref ? (
          <Link href={backHref} className={`text-sm ${themeLinkMuted}`}>
            {backLabel}
          </Link>
        ) : null}
        <h1 className={`mt-3 ${themePageTitle}`}>{title}</h1>
        {description ? (
          <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>{description}</p>
        ) : null}
      </header>
      <div className="mt-6">{children}</div>
    </main>
  )
}
