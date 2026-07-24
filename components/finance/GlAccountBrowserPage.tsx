"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { FilterSelectField } from "@/components/ui/FilterSelectField"
import {
  downloadGlAccountsExport,
  fetchGlAccounts,
  type GlAccountBrowserFilter,
} from "@/lib/finance-ui/gl-accounts"
import type {
  GlAccountListRow,
  GlAccountTreeNode,
} from "@/lib/finance/gl-account-list"
import {
  voucherInquiryFilterBar,
  voucherInquiryFilterField,
  voucherInquiryFilterInput,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel } from "@/lib/theme/theme-classes"

const ACCOUNT_TYPES = [
  "ALL",
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
] as const

export function GlAccountBrowserPage() {
  const [filter, setFilter] = useState<GlAccountBrowserFilter>({
    isActive: "all",
    view: "flat",
    limit: 100,
    offset: 0,
  })
  const [accounts, setAccounts] = useState<TreeRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const typeFilter =
        filter.accountType && filter.accountType !== "ALL"
          ? filter.accountType
          : undefined
      const result = await fetchGlAccounts({
        ...filter,
        accountType: typeFilter,
      })
      if (result.view === "tree") {
        const flat = flattenTree(result.accounts)
        setAccounts(flat)
        setTotal(result.total)
      } else {
        setAccounts(result.accounts)
        setTotal(result.total)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const typeFilter =
        filter.accountType && filter.accountType !== "ALL"
          ? filter.accountType
          : undefined
      await downloadGlAccountsExport({
        accountType: typeFilter,
        isActive: filter.isActive,
        search: filter.search,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Read-only chart of accounts. Export CSV, edit in a spreadsheet, then{" "}
        <Link href="/finance/accounts/import" className="underline">
          re-import
        </Link>
        .
      </p>

      <div className={voucherInquiryFilterBar}>
        <label className={voucherInquiryFilterField}>
          <span className={themeLabel}>Search</span>
          <input
            type="search"
            className={voucherInquiryFilterInput}
            value={filter.search ?? ""}
            onChange={(e) =>
              setFilter((f) => ({ ...f, search: e.target.value, offset: 0 }))
            }
          />
        </label>
        <FilterSelectField
          label="Type"
          wrapperClassName={voucherInquiryFilterField}
          value={filter.accountType ?? "ALL"}
          onChange={(value) =>
            setFilter((f) => ({
              ...f,
              accountType: value,
              offset: 0,
            }))
          }
          options={ACCOUNT_TYPES.map((t) => ({
            value: t,
            label: t,
          }))}
        />
        <FilterSelectField
          label="Active"
          wrapperClassName={voucherInquiryFilterField}
          value={filter.isActive ?? "all"}
          onChange={(value) =>
            setFilter((f) => ({
              ...f,
              isActive: value as GlAccountBrowserFilter["isActive"],
              offset: 0,
            }))
          }
          options={[
            { value: "true", label: "Active only" },
            { value: "false", label: "Inactive only" },
          ]}
          emptyOption={{ label: "All", value: "all" }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filter.view === "tree"}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                view: e.target.checked ? "tree" : "flat",
              }))
            }
          />
          Hierarchy view
        </label>
        <button
          type="button"
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
        <Link
          href="/finance/accounts/import"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
        >
          Import COA
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      {!loading && (
        <p className="text-sm text-zinc-500">
          {total} account{total === 1 ? "" : "s"}
        </p>
      )}

      <div className="overflow-x-auto rounded border border-zinc-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Parent</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Journal</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  {filter.view === "tree" && row.depth ? (
                    <span style={{ paddingLeft: `${(row.depth ?? 0) * 0.75}rem` }}>
                      <FinanceAccountDisplay accountCode={row.code} accountName={row.name} />
                    </span>
                  ) : (
                    <FinanceAccountDisplay accountCode={row.code} accountName={row.name} />
                  )}
                </td>
                <td className="px-3 py-2">{row.accountType}</td>
                <td className="px-3 py-2 font-mono text-zinc-500">
                  {row.parentCode ?? "—"}
                </td>
                <td className="px-3 py-2">{row.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  {row.hasJournalLines ? (
                    <span className="text-amber-700">Has activity</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type TreeRow = GlAccountListRow & { depth?: number }

function flattenTree(nodes: GlAccountTreeNode[], depth = 0): TreeRow[] {
  const out: TreeRow[] = []
  for (const node of nodes) {
    const { children, ...rest } = node
    out.push({ ...rest, depth })
    if (children?.length) {
      out.push(...flattenTree(children, depth + 1))
    }
  }
  return out
}
