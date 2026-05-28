import Link from "next/link"
import {
  buildCloseReadinessQuickLinks,
  type CloseReadinessNavLink,
} from "@/lib/finance-ui/close-readiness-links"
import type { CloseReadinessResult } from "@/lib/finance-ui/close-readiness"

type CloseReadinessEvidenceActionsProps = {
  readiness: CloseReadinessResult
}

function QuickLinkButton({ link }: { link: CloseReadinessNavLink }) {
  return (
    <Link
      href={link.href}
      className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
    >
      {link.label}
    </Link>
  )
}

export function CloseReadinessEvidenceActions({
  readiness,
}: CloseReadinessEvidenceActionsProps) {
  const quickLinks = buildCloseReadinessQuickLinks(readiness)

  return (
    <section className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-medium text-zinc-900">
        Evidence and traceability
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Reuse frozen snapshot detail, compare, evidence export, and issue trace
        panels. No live reconciliation recalculation from this page.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <QuickLinkButton key={`${link.label}:${link.href}`} link={link} />
        ))}
      </div>
      {readiness.priorSnapshotRef && readiness.latestSnapshotRef ? (
        <p className="mt-3 text-xs text-zinc-500">
          Compare uses prior capture {readiness.priorSnapshotRef.createdAt} against
          latest {readiness.latestSnapshotRef.createdAt}.
        </p>
      ) : null}
    </section>
  )
}