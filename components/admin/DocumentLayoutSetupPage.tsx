"use client"

import { useCallback, useEffect, useState } from "react"
import { ReceiptLayoutSetupPanel } from "@/components/admin/ReceiptLayoutSetupPanel"
import { RefundLayoutSetupPanel } from "@/components/admin/RefundLayoutSetupPanel"
import { TicketBlockLayoutSetupPanel } from "@/components/admin/TicketBlockLayoutSetupPanel"
import { TicketSetupStructuredPreview } from "@/components/admin/TicketSetupStructuredPreview"
import { MainMenuShell } from "@/components/main/MainMenuShell"
import {
  buildCollectorSetupTicketLayout,
} from "@/lib/admin/collector-setup-preview"
import {
  buildReadZSetupTicketLayout,
} from "@/lib/admin/read-z-setup-preview"
import {
  buildRepairTicketSetupTicketLayout,
} from "@/lib/admin/repair-ticket-setup-preview"
import { fetchThermalDocumentLayouts } from "@/lib/admin-ui/thermal-layout-client"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { THERMAL_CLONE_PRINT_STYLES } from "@/lib/thermal/print-css"
import type { ThermalDocumentType, ThermalLayoutMap } from "@/lib/thermal/types"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { themeMuted } from "@/lib/theme/theme-classes"

const DOCUMENT_TABS: { type: ThermalDocumentType; label: string }[] = [
  { type: "RECEIPT", label: "Receipt" },
  { type: "REFUND", label: "Refund" },
  { type: "COLLECTOR", label: "Collector" },
  { type: "REPAIR_TICKET", label: "Repair ticket" },
  { type: "READ_Z", label: "READ Z" },
]

const PRINT_SAMPLE_KIND: Record<ThermalDocumentType, string> = {
  RECEIPT: "receipt-setup-receipt",
  REFUND: "receipt-setup-refund",
  COLLECTOR: "receipt-setup-collector",
  REPAIR_TICKET: "receipt-setup-repair-ticket",
  READ_Z: "receipt-setup-read-z",
}

type DocumentLayoutSetupPageProps = {
  user: SessionUserApi
}

export function DocumentLayoutSetupPage({ user }: DocumentLayoutSetupPageProps) {
  const [layouts, setLayouts] = useState<ThermalLayoutMap>(DEFAULT_THERMAL_LAYOUTS)
  const [activeType, setActiveType] = useState<ThermalDocumentType>("RECEIPT")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchThermalDocumentLayouts()
      setLayouts(result.layouts)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load layouts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <MainMenuShell
      user={user}
      title="Receipt Setup"
      backHref="/master"
      backLabel="← ADMINISTRATION"
    >
      <p className={`text-sm ${themeMuted}`}>
        Configure thermal ticket layout blocks and preview with live shop data. All tickets use
        80mm paper with 72mm printable width.
      </p>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {DOCUMENT_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            className={`rounded border px-3 py-1.5 text-sm font-medium ${
              activeType === tab.type
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
            onClick={() => setActiveType(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`mt-4 text-sm ${themeMuted}`}>Loading…</p>
      ) : activeType === "RECEIPT" ? (
        <ReceiptLayoutSetupPanel
          initialLayout={layouts.RECEIPT}
          onSaved={(layout) => {
            setLayouts((prev) => ({ ...prev, RECEIPT: layout }))
          }}
        />
      ) : activeType === "REFUND" ? (
        <RefundLayoutSetupPanel
          initialLayout={layouts.REFUND}
          receiptLayout={layouts.RECEIPT}
          onSaved={(layout) => {
            setLayouts((prev) => ({ ...prev, REFUND: layout }))
          }}
        />
      ) : activeType === "COLLECTOR" ? (
        <TicketBlockLayoutSetupPanel
          title="Collector layout"
          documentType="COLLECTOR"
          printSampleKind={PRINT_SAMPLE_KIND.COLLECTOR}
          initialLayout={layouts.COLLECTOR}
          onSaved={(layout) => {
            setLayouts((prev) => ({ ...prev, COLLECTOR: layout }))
          }}
          renderPreview={({ draft, branch, companyTaxId }) => (
            <TicketSetupStructuredPreview
              testId="collector-setup-preview"
              layout={buildCollectorSetupTicketLayout({
                layout: draft,
                branch,
                companyTaxId,
              })}
            />
          )}
        />
      ) : activeType === "REPAIR_TICKET" ? (
        <TicketBlockLayoutSetupPanel
          title="Repair ticket layout"
          documentType="REPAIR_TICKET"
          printSampleKind={PRINT_SAMPLE_KIND.REPAIR_TICKET}
          initialLayout={layouts.REPAIR_TICKET}
          onSaved={(layout) => {
            setLayouts((prev) => ({ ...prev, REPAIR_TICKET: layout }))
          }}
          renderPreview={({ draft, branch, companyTaxId }) => (
            <TicketSetupStructuredPreview
              testId="repair-ticket-setup-preview"
              layout={buildRepairTicketSetupTicketLayout({
                layout: draft,
                branch,
                companyTaxId,
              })}
            />
          )}
        />
      ) : (
        <TicketBlockLayoutSetupPanel
          title="READ Z layout"
          documentType="READ_Z"
          printSampleKind={PRINT_SAMPLE_KIND.READ_Z}
          initialLayout={layouts.READ_Z}
          onSaved={(layout) => {
            setLayouts((prev) => ({ ...prev, READ_Z: layout }))
          }}
          renderPreview={({ draft, branch, companyTaxId }) => (
            <TicketSetupStructuredPreview
              testId="read-z-setup-preview"
              layout={buildReadZSetupTicketLayout({
                layout: draft,
                branch,
                companyTaxId,
              })}
            />
          )}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: THERMAL_CLONE_PRINT_STYLES }} />
    </MainMenuShell>
  )
}

/** @deprecated Use DocumentLayoutSetupPage */
export const ReceiptSetupPage = DocumentLayoutSetupPage
