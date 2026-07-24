"use client"

import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import type { BankStatementStatus } from "@/lib/finance/bank-statement"
import type { BankAccountRow } from "@/lib/finance/bank-account"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import {
  voucherInquiryFilterBar,
  voucherInquiryFilterInput,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel } from "@/lib/theme/theme-classes"

export type BankStatementStatusFilter = BankStatementStatus | "all"

export type BankStatementFilterValues = {
  periodKey: string
  bankAccountId: string
  statusFilter: BankStatementStatusFilter
  search: string
}

type BankStatementFilterBarProps = {
  bankAccounts: BankAccountRow[]
  periods: AccountingPeriodRow[]
  periodsLoading?: boolean
  values: BankStatementFilterValues
  onChange: (patch: Partial<BankStatementFilterValues>) => void
  onApply: () => void
  loading?: boolean
}

export function BankStatementFilterBar({
  bankAccounts,
  periods,
  periodsLoading = false,
  values,
  onChange,
  onApply,
  loading = false,
}: BankStatementFilterBarProps) {
  return (
    <section className={voucherInquiryFilterBar} aria-label="Bank statement filters">
      <div className="finance-filter-field finance-filter-field--period-key">
        <label htmlFor="bs-filter-period" className={themeLabel}>
          Period
        </label>
        <AccountingPeriodSelect
          id="bs-filter-period"
          className="finance-filter-control finance-filter-control--mono"
          periods={periods}
          value={values.periodKey || null}
          onChange={(periodKey) => onChange({ periodKey })}
          loading={periodsLoading}
          showEmptyHint={false}
          data-testid="bank-statement-filter-period"
        />
      </div>

      <div className="finance-filter-field finance-filter-field--gl-account">
        <label htmlFor="bs-filter-bank-account" className={themeLabel}>
          Bank account
        </label>
        <select
          id="bs-filter-bank-account"
          className={voucherInquiryFilterSelect}
          value={values.bankAccountId}
          onChange={(event) => onChange({ bankAccountId: event.target.value })}
          data-testid="bank-statement-filter-bank-account"
        >
          <option value="">All bank accounts</option>
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bankName} • {account.accountNumber}
            </option>
          ))}
        </select>
      </div>

      <div className="finance-filter-field">
        <label htmlFor="bs-filter-status" className={themeLabel}>
          Status
        </label>
        <select
          id="bs-filter-status"
          className={voucherInquiryFilterSelect}
          value={values.statusFilter}
          onChange={(event) =>
            onChange({ statusFilter: event.target.value as BankStatementStatusFilter })
          }
          data-testid="bank-statement-filter-status"
        >
          <option value="all">All</option>
          <option value="NEW">New</option>
          <option value="DRAFT">Draft</option>
          <option value="READY">Ready</option>
        </select>
      </div>

      <div className="finance-filter-field finance-filter-field--no">
        <label htmlFor="bs-filter-search" className={themeLabel}>
          Search
        </label>
        <input
          id="bs-filter-search"
          type="search"
          className={voucherInquiryFilterInput}
          value={values.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Statement no, bank…"
          data-testid="bank-statement-filter-search"
        />
      </div>

      <InquiryFilterActions
        mode="apply-only"
        onPrimary={onApply}
        loading={loading}
        loadingPrimaryLabel="Loading…"
        primaryTestId="bank-statement-filter-apply"
        className="finance-filter-actions"
      />
    </section>
  )
}
