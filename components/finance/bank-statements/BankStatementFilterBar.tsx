"use client"

import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { StatusFilterField } from "@/components/ui/FilterSelectField"
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
        <StatusFilterField
          id="bs-filter-status"
          labelClassName={themeLabel}
          wrapperClassName=""
          selectClassName={voucherInquiryFilterSelect}
          value={values.statusFilter}
          onChange={(value) =>
            onChange({ statusFilter: value as BankStatementStatusFilter })
          }
          emptyOption={{ label: "All", value: "all" }}
          options={[
            { value: "NEW", label: "New" },
            { value: "DRAFT", label: "Draft" },
            { value: "READY", label: "Ready" },
          ]}
          data-testid="bank-statement-filter-status"
        />
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
