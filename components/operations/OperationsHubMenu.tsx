import Link from "next/link"
import type { MainMenuItem, MainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import {
  themeMenuAppCard,
  themeMenuAppCardBadge,
  themeMenuAppCardPlanned,
  themeMenuCardHint,
  themeMenuCardTitle,
} from "@/lib/theme/theme-classes"

type OperationsHubMenuProps = {
  section: MainMenuSectionDetail
}

function findItem(items: MainMenuItem[], key: string): MainMenuItem | undefined {
  return items.find((item) => item.key === key)
}

function AvailableCard({ item }: { item: MainMenuItem }) {
  if (!item.href) return null

  return (
    <Link href={item.href} className={`${themeMenuAppCard} cursor-pointer`}>
      <span className={themeMenuCardTitle}>{item.label}</span>
      {item.hint ? (
        <span className={`${themeMenuCardHint} mt-auto pt-2`}>{item.hint}</span>
      ) : null}
    </Link>
  )
}

function PlannedCard({ item }: { item: MainMenuItem }) {
  return (
    <div aria-disabled="true" className={themeMenuAppCardPlanned}>
      <div className="flex items-start justify-between gap-2">
        <span className={themeMenuCardTitle}>{item.label}</span>
        <span className={themeMenuAppCardBadge}>Planned</span>
      </div>
      {item.hint ? (
        <span className={`${themeMenuCardHint} mt-auto pt-2`}>{item.hint}</span>
      ) : null}
    </div>
  )
}

function renderCard(item: MainMenuItem | undefined) {
  if (!item) return null
  if (item.status === "available" && item.href) {
    return <AvailableCard item={item} />
  }
  return <PlannedCard item={item} />
}

export function OperationsHubMenu({ section }: OperationsHubMenuProps) {
  const items = section.items
  const stockDocuments = findItem(items, "stock-documents")
  const catalogImage = findItem(items, "catalog-image")
  const catalogUpload = findItem(items, "catalog-upload")
  const stockCard = findItem(items, "stock-card")
  const stockMovement = findItem(items, "stock-movement")
  const supplierOrder = findItem(items, "supplier-order")

  return (
    <nav className="mt-4 space-y-3" aria-label={section.label}>
      {stockDocuments ? (
        <div className="grid gap-3">{renderCard(stockDocuments)}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {renderCard(stockCard)}
        {renderCard(stockMovement)}
      </div>

      {supplierOrder ? (
        <div className="grid gap-3">{renderCard(supplierOrder)}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {renderCard(catalogImage)}
        {renderCard(catalogUpload)}
      </div>
    </nav>
  )
}
