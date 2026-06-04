"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { MainMenuShell } from "@/components/main/MainMenuShell"
import { DEFAULT_RECEIPT_PRINT_SETTINGS } from "@/lib/receipt-settings/defaults"
import type { ReceiptPrintSettingsView } from "@/lib/receipt-settings/types"
import {
  fetchReceiptPrintSettings,
  patchReceiptPrintSettings,
} from "@/lib/admin-ui/receipt-settings-client"
import {
  buildReceiptSlipText,
  RECEIPT_COLUMNS,
} from "@/lib/pos/receipt-slip-format"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  themeBtnPrimary,
  themeCard,
  themeInput,
  themeMuted,
  themePageTitle,
} from "@/lib/theme/theme-classes"

const SAMPLE_CONTEXT: ReceiptPrintContext = {
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
  settings: { ...DEFAULT_RECEIPT_PRINT_SETTINGS },
}

type ReceiptSetupPageProps = {
  user: SessionUserApi
}

export function ReceiptSetupPage({ user }: ReceiptSetupPageProps) {
  const [settings, setSettings] = useState<ReceiptPrintSettingsView>({
    ...DEFAULT_RECEIPT_PRINT_SETTINGS,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReceiptPrintSettings()
      setSettings(result.settings)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const previewContext: ReceiptPrintContext = {
    ...SAMPLE_CONTEXT,
    companyDisplayName: settings.companyDisplayName,
    settings,
  }
  const previewText = buildReceiptSlipText(previewContext)

  const onSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await patchReceiptPrintSettings(settings)
      setSettings(result.settings)
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainMenuShell
      user={user}
      title="Receipt Setup"
      backHref="/master"
      backLabel="← ADMINISTRATION"
    >
      <p className={`text-sm ${themeMuted}`}>
        Company name and footer lines print on POS receipts. Company Tax ID is set on branch{" "}
        <strong>HO999</strong>; machine ID on each shop branch. Address and phone are edited
        under Master → Branch.
      </p>

      {loading ? (
        <p className={`mt-4 text-sm ${themeMuted}`}>Loading…</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className={`${themeCard} space-y-4 p-4`}>
            <h2 className={themePageTitle}>Layout</h2>

            <label className="block">
              <span className="text-sm text-muted-foreground">Company display name</span>
              <input
                type="text"
                value={settings.companyDisplayName ?? ""}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    companyDisplayName: event.target.value,
                  }))
                }
                className={themeInput}
                disabled={saving}
              />
            </label>

            {([1, 2, 3, 4, 5] as const).map((n) => {
              const key = `footerLine${n}` as keyof ReceiptPrintSettingsView
              return (
                <label key={n} className="block">
                  <span className="text-sm text-muted-foreground">Footer line {n}</span>
                  <input
                    type="text"
                    value={(settings[key] as string | null) ?? ""}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    className={themeInput}
                    disabled={saving}
                  />
                </label>
              )
            })}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showAbbreviatedTaxTitle}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    showAbbreviatedTaxTitle: event.target.checked,
                  }))
                }
                disabled={saving}
              />
              <span className="text-sm">Show ใบกำกับภาษีอย่างย่อ</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showVatIncludedMessage}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    showVatIncludedMessage: event.target.checked,
                  }))
                }
                disabled={saving}
              />
              <span className="text-sm">Show ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว</span>
            </label>

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
              Sample slip ({RECEIPT_COLUMNS} columns). Tax IDs in preview are placeholders.
            </p>
            <div className="receipt-setup-preview">
              <pre
                className="receipt-setup-preview-slip"
                style={
                  {
                    ["--receipt-slip-ch-width"]: `${RECEIPT_COLUMNS}ch`,
                  } as CSSProperties
                }
                aria-label="Receipt preview"
              >
                {previewText}
              </pre>
            </div>
          </div>
        </div>
      )}
    </MainMenuShell>
  )
}
