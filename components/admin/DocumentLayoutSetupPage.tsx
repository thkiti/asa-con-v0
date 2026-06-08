"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import { MainMenuShell } from "@/components/main/MainMenuShell"
import { ThermalSlipPre } from "@/components/thermal/ThermalSlipPre"
import {
  fetchThermalDocumentLayouts,
  patchThermalDocumentLayout,
} from "@/lib/admin-ui/thermal-layout-client"
import { buildCollectorSlipText } from "@/lib/thermal/build-collector-slip"
import { buildReadZSlipText } from "@/lib/thermal/build-read-z-slip"
import { buildRepairTicketSlipText } from "@/lib/thermal/build-repair-ticket-slip"
import { buildReceiptSlipText } from "@/lib/pos/receipt-slip-format"
import { buildRefundSlipText } from "@/lib/pos/refund-slip-format"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"
import type {
  ThermalDocumentLayoutView,
  ThermalDocumentType,
  ThermalLayoutMap,
} from "@/lib/thermal/types"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  themeBtnPrimary,
  themeCard,
  themeInput,
  themeMuted,
  themePageTitle,
} from "@/lib/theme/theme-classes"

const DOCUMENT_TABS: { type: ThermalDocumentType; label: string }[] = [
  { type: "RECEIPT", label: "Receipt" },
  { type: "REFUND", label: "Refund" },
  { type: "COLLECTOR", label: "Collector" },
  { type: "REPAIR_TICKET", label: "Repair ticket" },
  { type: "READ_Z", label: "READ Z" },
]

const SAMPLE_RECEIPT: ReceiptPrintContext = {
  saleId: "preview",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: "2026-06-04T12:00:00.000Z",
  branchCode: "SH001",
  branchName: "Shop One",
  branchAddress: "123 Sample Road",
  branchPhone: "02-000-0000",
  companyDisplayName: "ASA SERVICES",
  companyTaxId: "0000000000000",
  machineTaxId: "MACHINE-001",
  cashierDisplay: "103-Somsak",
  lines: [
    {
      name: "Sample Product",
      code: "0101001",
      qty: 1,
      unitPrice: "60.00",
      lineTotal: "60.00",
    },
  ],
  total: "60.00",
  paymentMethod: "CASH",
  cashAmount: "60.00",
  change: "0.00",
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: DEFAULT_THERMAL_LAYOUTS.RECEIPT,
}

const SAMPLE_REFUND: RefundReceiptPrintContext = {
  refundId: "preview",
  refundNo: "RF-SH001-202606-0001",
  issuedAt: "2026-06-04T12:30:00.000Z",
  kind: "SALE_LINKED",
  amount: "60.00",
  reason: "Sample reason",
  branchId: "branch",
  branchCode: "SH001",
  branchName: "Shop One",
  branchAddress: "123 Sample Road",
  branchPhone: "02-000-0000",
  companyDisplayName: "ASA SERVICES",
  companyTaxId: "0000000000000",
  machineTaxId: "MACHINE-001",
  cashierDisplay: "103-Somsak",
  saleId: "sale",
  originalReceiptId: "receipt",
  originalReceiptNo: "REC-SH001-202606-0001",
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: DEFAULT_THERMAL_LAYOUTS.REFUND,
}

const SAMPLE_READ_REPORT: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "103",
  staffName: "Somsak",
  branchCode: "SH001",
  branchName: "Shop One",
  groupLines: [
    { lineKey: "g1", displayLeft: "010-Sample Group", qty: 2, amount: 120 },
  ],
  paymentLines: [{ key: "CASH", label: "Cash", amount: 120 }],
  grandTotal: 120,
  saleCount: 2,
  refundCount: 1,
  refundTotal: 20,
  netTotal: 100,
}

function layoutInputFromView(view: ThermalDocumentLayoutView) {
  return {
    headerLine1: view.headerLine1,
    headerLine2: view.headerLine2,
    headerLine3: view.headerLine3,
    footerLine1: view.footerLine1,
    footerLine2: view.footerLine2,
    footerLine3: view.footerLine3,
    footerLine4: view.footerLine4,
    footerLine5: view.footerLine5,
    showAbbreviatedTaxTitle: view.showAbbreviatedTaxTitle,
    showVatIncludedMessage: view.showVatIncludedMessage,
  }
}

function buildPreviewText(
  type: ThermalDocumentType,
  layouts: ThermalLayoutMap,
  draft: ThermalDocumentLayoutView
): string {
  const merged: ThermalLayoutMap = { ...layouts, [type]: draft }
  const resolved = resolveThermalLayout(type, merged)

  switch (type) {
    case "RECEIPT":
      return buildReceiptSlipText({
        ...SAMPLE_RECEIPT,
        thermalLayouts: merged,
        thermalLayout: resolved,
      })
    case "REFUND":
      return buildRefundSlipText({
        ...SAMPLE_REFUND,
        thermalLayouts: merged,
        thermalLayout: resolved,
      })
    case "COLLECTOR":
      return buildCollectorSlipText(
        { ...SAMPLE_READ_REPORT, mode: "COLLECT", bangkokDateFrom: "2026-06-01", bangkokDateTo: "2026-06-07" },
        resolved
      )
    case "REPAIR_TICKET":
      return buildRepairTicketSlipText(
        {
          ticketNo: "RT-SH001-202606-0001",
          branchName: "Shop One",
          issuedAt: "2026-06-04T12:00:00.000Z",
          fileNames: ["photo-1.jpg", "photo-2.jpg"],
        },
        resolved
      )
    case "READ_Z":
      return buildReadZSlipText(SAMPLE_READ_REPORT, resolved)
    default:
      return ""
  }
}

type DocumentLayoutSetupPageProps = {
  user: SessionUserApi
}

export function DocumentLayoutSetupPage({ user }: DocumentLayoutSetupPageProps) {
  const [layouts, setLayouts] = useState<ThermalLayoutMap>(DEFAULT_THERMAL_LAYOUTS)
  const [activeType, setActiveType] = useState<ThermalDocumentType>("RECEIPT")
  const [draft, setDraft] = useState<ThermalDocumentLayoutView>(DEFAULT_THERMAL_LAYOUTS.RECEIPT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchThermalDocumentLayouts()
      setLayouts(result.layouts)
      setDraft(result.layouts.RECEIPT)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load layouts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setDraft(layouts[activeType])
    setSaved(false)
  }, [activeType, layouts])

  const previewText = useMemo(
    () => buildPreviewText(activeType, layouts, draft),
    [activeType, layouts, draft]
  )

  const onSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await patchThermalDocumentLayout(activeType, layoutInputFromView(draft))
      setLayouts((prev) => ({ ...prev, [activeType]: result.layout }))
      setDraft(result.layout)
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const showTaxFlags = activeType === "RECEIPT" || activeType === "REFUND"

  return (
    <MainMenuShell
      user={user}
      title="Document Layout Setup"
      backHref="/master"
      backLabel="← ADMINISTRATION"
    >
      <p className={`text-sm ${themeMuted}`}>
        Thermal 80mm header/footer lines per document type. Branch address, tax IDs, and
        transaction lines come from branch master and sale data at print time. REFUND inherits
        empty header/footer fields from RECEIPT.
      </p>

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
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className={`${themeCard} space-y-4 p-4`}>
            <h2 className={themePageTitle}>{activeType} layout</h2>

            {activeType === "REFUND" ? (
              <p className={`text-xs ${themeMuted}`}>
                Leave header/footer blank to inherit from RECEIPT. Saving non-empty values
                stores REFUND-specific overrides.
              </p>
            ) : null}

            {([1, 2, 3] as const).map((n) => {
              const key = `headerLine${n}` as keyof ThermalDocumentLayoutView
              return (
                <label key={key} className="block">
                  <span className="text-sm text-muted-foreground">Header line {n}</span>
                  <input
                    type="text"
                    value={(draft[key] as string | null) ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, [key]: event.target.value || null }))
                    }
                    className={themeInput}
                    disabled={saving}
                  />
                </label>
              )
            })}

            {([1, 2, 3, 4, 5] as const).map((n) => {
              const key = `footerLine${n}` as keyof ThermalDocumentLayoutView
              return (
                <label key={key} className="block">
                  <span className="text-sm text-muted-foreground">Footer line {n}</span>
                  <input
                    type="text"
                    value={(draft[key] as string | null) ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, [key]: event.target.value || null }))
                    }
                    className={themeInput}
                    disabled={saving}
                  />
                </label>
              )
            })}

            {showTaxFlags ? (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.showAbbreviatedTaxTitle}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        showAbbreviatedTaxTitle: event.target.checked,
                      }))
                    }
                    disabled={saving}
                  />
                  <span className="text-sm">Show ใบกำกับภาษีอย่างย่อ</span>
                </label>
                {activeType === "RECEIPT" ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.showVatIncludedMessage}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          showVatIncludedMessage: event.target.checked,
                        }))
                      }
                      disabled={saving}
                    />
                    <span className="text-sm">Show ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว</span>
                  </label>
                ) : null}
              </>
            ) : null}

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {saved ? (
              <p className="text-sm text-green-700" role="status">
                Saved.
              </p>
            ) : null}

            <button
              type="button"
              className={themeBtnPrimary}
              onClick={() => void onSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <div className={`${themeCard} p-4`}>
            <h2 className={themePageTitle}>Preview</h2>
            <p className={`mt-1 text-xs ${themeMuted}`}>
              Sample slip ({THERMAL_COLUMNS} columns) — same builder as print.
            </p>
            <div className="receipt-setup-preview mt-3">
              <ThermalSlipPre text={previewText} ariaLabel={`${activeType} preview`} />
            </div>
          </div>
        </div>
      )}
    </MainMenuShell>
  )
}

/** @deprecated Use DocumentLayoutSetupPage */
export const ReceiptSetupPage = DocumentLayoutSetupPage
