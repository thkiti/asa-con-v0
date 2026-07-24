"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { VoucherInquiryPdfIndicator } from "@/components/finance/VoucherInquiryPdfIndicator"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { BranchSelect } from "@/components/ui/BranchSelect"
import {
  DocumentTypeFilterField,
  FilterSelectField,
  StatusFilterField,
} from "@/components/ui/FilterSelectField"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import { ListPagination } from "@/components/ui/ListPagination"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  financeMemo,
  financeTable,
  financeTableScroll,
  financeTh,
  voucherInquiryActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterBranchReadable,
  voucherInquiryFilterInput,
  voucherInquiryFilterNoCompact,
  voucherInquiryFilterPostingState,
  voucherInquiryFilterSelect,
  voucherInquiryTable,
  voucherInquiryTdActions,
  voucherInquiryTdDate,
  voucherInquiryTdDocNo,
  voucherInquiryTdVoucherNo,
} from "@/lib/finance-ui/finance-visual-classes"
import { appendFinanceReturnTo, buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import {
  hasFinanceDocumentInquiryBranch,
  hasFinanceDocumentInquiryDocType,
  isFinanceDocumentInquiryRecDocType,
  VOUCHER_INQUIRY_REF_TYPE_OPTIONS,
} from "@/lib/finance/inquiry/voucher-document-types"
import {
  FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS,
  FINANCE_DOCUMENT_INQUIRY_STATUS_OPTIONS,
} from "@/lib/finance/inquiry/finance-document-inquiry-filter-options"
import {
  applyVoucherInquiryNoToFilter,
  resolveVoucherInquiryNoDisplay,
} from "@/lib/finance-ui/voucher-inquiry-no-filter"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import { defaultTrialBalancePeriodParts } from "@/lib/finance-ui/trial-balance-period"
import {
  formatFinanceDocumentInquiryPageSummary,
  FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE,
  resetFinanceDocumentInquiryPage,
  resolveFinanceDocumentInquiryPage,
  withFinanceDocumentInquiryPage,
} from "@/lib/finance-ui/finance-document-inquiry-paging"
import {
  buildVoucherInquiryReturnPath,
  buildVoucherInquirySearchParams,
  fetchFinanceDocuments,
  parseVoucherInquiryFilterFromSearchParams,
} from "@/lib/finance-ui/voucher-inquiry"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import type {
  FinanceDocumentInquiryRow,
  FinanceVoucherInquiryFilter,
} from "@/lib/finance-ui/types"
import {
  themeEmptyState,
  themeInlineError,
  themeLabel,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

const DOC_TYPE_REQUIRED_MESSAGE = "เลือก Doc Type เพื่อค้นหาเอกสาร"
const REC_SHOP_REQUIRED_MESSAGE =
  "สำหรับ REC เนื่องจากมีเอกสารจำนวนมาก กรุณาเลือก Shop และค้นหาครั้งละหนึ่ง Period"

function defaultInquiryPeriodKey(): string {
  return defaultTrialBalancePeriodParts().periodKey
}

const emptyFilter = (): FinanceVoucherInquiryFilter =>
  resetFinanceDocumentInquiryPage({
    postingState: "all",
    periodKey: defaultInquiryPeriodKey(),
  })

function withRequiredPeriod(
  filter: FinanceVoucherInquiryFilter
): FinanceVoucherInquiryFilter {
  const periodKey = filter.periodKey?.trim()
  if (periodKey) return filter
  return { ...filter, periodKey: defaultInquiryPeriodKey() }
}

function withDefaultInquiryPaging(
  filter: FinanceVoucherInquiryFilter
): FinanceVoucherInquiryFilter {
  return {
    ...filter,
    limit: filter.limit ?? FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE,
    offset: filter.offset ?? 0,
  }
}

function needsRecShopSelection(filter: FinanceVoucherInquiryFilter): boolean {
  return (
    isFinanceDocumentInquiryRecDocType(filter.refType) &&
    !hasFinanceDocumentInquiryBranch(filter.branchId)
  )
}

function isSearchableInquiryFilter(filter: FinanceVoucherInquiryFilter): boolean {
  if (!hasFinanceDocumentInquiryDocType(filter.refType)) return false
  if (needsRecShopSelection(filter)) return false
  return true
}

type VoucherInquiryResultsTableProps = {
  documents: FinanceDocumentInquiryRow[]
  total: number
  page: number
  totalPages: number
  listReturnPath: string
  onPageChange: (page: number) => void
}

export function VoucherInquiryResultsTable({
  documents,
  total,
  page,
  totalPages,
  listReturnPath,
  onPageChange,
}: VoucherInquiryResultsTableProps) {
  return (
    <>
      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        summary={
          <p className={`text-sm ${themeTextSecondary}`}>
            {formatFinanceDocumentInquiryPageSummary(total, page, totalPages)}
          </p>
        }
        summaryTestId="voucher-inquiry-page-summary"
        testId="voucher-inquiry-pagination"
        prevTestId="voucher-inquiry-page-prev"
        nextTestId="voucher-inquiry-page-next"
      />
      <div className={financeTableScroll}>
        <table
          className={`${financeTable} ${voucherInquiryTable}`}
          data-testid="voucher-inquiry-table"
        >
          <thead>
            <tr>
              <th className={financeTh}>Doc No.</th>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Voucher No.</th>
              <th className={financeTh}>PDF</th>
              <th className={financeTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className={`py-4 text-center ${themeEmptyState}`}>
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              documents.map((row) => (
                <tr key={`${row.rowKind}-${row.id}`} data-testid={`voucher-inquiry-row-${row.id}`}>
                  <td className={`${financeMemo} ${voucherInquiryTdDocNo}`}>
                    {row.documentNo ?? "—"}
                  </td>
                  <td className={voucherInquiryTdDate}>{formatFinanceListDate(row.date)}</td>
                  <td className={voucherInquiryTdVoucherNo}>
                    {row.voucherNo && row.journalEntryId ? (
                      <Link
                        href={buildFinanceJournalInquiryPath(row.journalEntryId, listReturnPath)}
                        className={themeLinkMuted}
                        data-testid={`voucher-inquiry-journal-${row.id}`}
                      >
                        {row.voucherNo}
                      </Link>
                    ) : (
                      (row.voucherNo ?? "—")
                    )}
                  </td>
                  <td>
                    <VoucherInquiryPdfIndicator row={row} />
                  </td>
                  <td className={voucherInquiryTdActions}>
                    <div className={voucherInquiryActions}>
                      <Link
                        href={appendFinanceReturnTo(row.inquiryPath, listReturnPath)}
                        className={themeLinkMuted}
                        data-testid={`voucher-inquiry-view-${row.id}`}
                      >
                        Inquiry
                      </Link>
                      {row.printPath ? (
                        <Link
                          href={appendFinanceReturnTo(row.printPath, listReturnPath)}
                          className={themeLinkMuted}
                          data-testid={`voucher-inquiry-print-${row.id}`}
                        >
                          Print
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function VoucherInquiryListPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const appliedFilter = useMemo(
    () =>
      withDefaultInquiryPaging(
        withRequiredPeriod(parseVoucherInquiryFilterFromSearchParams(searchParams))
      ),
    [searchParams]
  )

  const [draft, setDraft] = useState<FinanceVoucherInquiryFilter>(() =>
    withDefaultInquiryPaging(withRequiredPeriod(appliedFilter))
  )
  const [inquiryNo, setInquiryNo] = useState(() => resolveVoucherInquiryNoDisplay(appliedFilter))
  const [documents, setDocuments] = useState<FinanceDocumentInquiryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(() => isSearchableInquiryFilter(appliedFilter))
  const [error, setError] = useState<string | null>(null)
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])

  const listReturnPath = useMemo(
    () => buildVoucherInquiryReturnPath(appliedFilter),
    [appliedFilter]
  )

  const appliedFilterQuery = useMemo(
    () => buildVoucherInquirySearchParams(appliedFilter).toString(),
    [appliedFilter]
  )

  const hasAppliedDocType = hasFinanceDocumentInquiryDocType(appliedFilter.refType)
  const needsRecShop = needsRecShopSelection(appliedFilter)
  const canShowResults = isSearchableInquiryFilter(appliedFilter)
  const pageInfo = resolveFinanceDocumentInquiryPage(appliedFilter, total)

  const { isMoreFilterOpen, setIsMoreFilterOpen } = useInquiryMoreFilterOpen(appliedFilterQuery)

  useEffect(() => {
    setDraft(appliedFilter)
    setInquiryNo(resolveVoucherInquiryNoDisplay(appliedFilter))
  }, [appliedFilter])

  useEffect(() => {
    void fetchPosSettlementBranches()
      .then((result) => setBranches(result.items))
      .catch(() => setBranches([]))
  }, [])

  const load = useCallback(async (filter: FinanceVoucherInquiryFilter) => {
    if (!isSearchableInquiryFilter(filter)) {
      setDocuments([])
      setTotal(0)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinanceDocuments(
        legalEntityCode,
        withDefaultInquiryPaging(filter)
      )
      setDocuments(result.documents)
      setTotal(result.total)
    } catch (err) {
      setDocuments([])
      setTotal(0)
      setError(err instanceof Error ? err.message : "Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [legalEntityCode])

  useEffect(() => {
    void load(appliedFilter)
  }, [appliedFilter, load])

  const navigateWithFilter = (next: FinanceVoucherInquiryFilter) => {
    const params = buildVoucherInquirySearchParams(withDefaultInquiryPaging(next))
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const applyFilters = () => {
    setIsMoreFilterOpen(false)
    const next = resetFinanceDocumentInquiryPage(
      applyVoucherInquiryNoToFilter(withRequiredPeriod(draft), inquiryNo)
    )
    if (!isSearchableInquiryFilter(next)) {
      setDocuments([])
      setTotal(0)
      setError(null)
      setLoading(false)
    }
    navigateWithFilter(next)
  }

  const clearFilters = () => {
    setIsMoreFilterOpen(false)
    const cleared = emptyFilter()
    setDraft(cleared)
    setInquiryNo("")
    setDocuments([])
    setTotal(0)
    setError(null)
    setLoading(false)
    navigateWithFilter(cleared)
  }

  const handleDocTypeChange = (value: string) => {
    const refType = value.trim() || undefined
    const next = resetFinanceDocumentInquiryPage(
      applyVoucherInquiryNoToFilter(
        withRequiredPeriod({ ...draft, refType }),
        inquiryNo
      )
    )
    setDraft(next)
    setIsMoreFilterOpen(false)
    if (!isSearchableInquiryFilter(next)) {
      setDocuments([])
      setTotal(0)
      setError(null)
      setLoading(false)
    }
    navigateWithFilter(next)
  }

  const handleBranchChange = (value: string) => {
    const branchId = value.trim() || undefined
    const next = resetFinanceDocumentInquiryPage(
      applyVoucherInquiryNoToFilter(
        withRequiredPeriod({ ...draft, branchId }),
        inquiryNo
      )
    )
    setDraft(next)
    setIsMoreFilterOpen(false)
    if (!isSearchableInquiryFilter(next)) {
      setDocuments([])
      setTotal(0)
      setError(null)
      setLoading(false)
    }
    navigateWithFilter(next)
  }

  const handlePageChange = (page: number) => {
    navigateWithFilter(withFinanceDocumentInquiryPage(appliedFilter, page))
  }

  return (
    <div className="space-y-4" data-testid="voucher-inquiry-list-page">
      <div className={voucherInquiryFilterBar} data-testid="voucher-inquiry-filters">
        <BranchSelect
          label="Branch"
          labelClassName={themeLabel}
          wrapperClassName={voucherInquiryFilterBranchReadable}
          selectClassName={voucherInquiryFilterSelect}
          value={draft.branchId ?? ""}
          onChange={handleBranchChange}
          options={branches}
          emptyOption
          formatOptionLabel={formatPosSettlementBranchLabel}
          data-testid="voucher-inquiry-filter-branch"
        />
        <DocumentInquiryMoreFilter
          periodKey={draft.periodKey ?? defaultInquiryPeriodKey()}
          onPeriodKeyChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              periodKey: value.trim() || defaultInquiryPeriodKey(),
            }))
          }
          periodTestId="voucher-inquiry-filter-period"
          periodMode="calendar"
          from={draft.from ?? ""}
          to={draft.to ?? ""}
          onFromChange={(value) =>
            setDraft((prev) => ({ ...prev, from: value || undefined }))
          }
          onToChange={(value) =>
            setDraft((prev) => ({ ...prev, to: value || undefined }))
          }
          testIdPrefix="voucher-inquiry"
          isMoreFilterOpen={isMoreFilterOpen}
          setIsMoreFilterOpen={setIsMoreFilterOpen}
        />
        <DocumentTypeFilterField
          value={draft.refType ?? ""}
          onChange={handleDocTypeChange}
          required
          emptyOption={{ label: "เลือก Doc Type" }}
          options={VOUCHER_INQUIRY_REF_TYPE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          data-testid="voucher-inquiry-filter-document-type"
        />
        <label className={voucherInquiryFilterNoCompact}>
          <span className={themeLabel}>No</span>
          <input
            className={voucherInquiryFilterInput}
            value={inquiryNo}
            onChange={(e) => setInquiryNo(e.target.value)}
            placeholder="MJV-… or V-…"
            data-testid="voucher-inquiry-filter-no"
          />
        </label>
        <StatusFilterField
          value={draft.status ?? ""}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, status: value || undefined }))
          }
          options={FINANCE_DOCUMENT_INQUIRY_STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          data-testid="voucher-inquiry-filter-status"
        />
        <FilterSelectField
          label="Posted"
          wrapperClassName={voucherInquiryFilterPostingState}
          value={draft.postingState ?? "all"}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              postingState:
                value === "all" ? "all" : (value as "posted" | "unposted"),
            }))
          }
          options={FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          data-testid="voucher-inquiry-filter-posting-state"
        />
        <InquiryFilterActions
          onPrimary={applyFilters}
          onClear={clearFilters}
          dismissOnAction
          primaryTestId="voucher-inquiry-search"
          clearTestId="voucher-inquiry-clear"
        />
      </div>

      {loading ? <p className={themeEmptyState}>Loading…</p> : null}
      {error ? <p className={themeInlineError}>{error}</p> : null}

      {!loading && !error && !hasAppliedDocType ? (
        <p
          className={`py-8 text-center ${themeEmptyState}`}
          data-testid="voucher-inquiry-doc-type-required"
        >
          {DOC_TYPE_REQUIRED_MESSAGE}
        </p>
      ) : null}

      {!loading && !error && hasAppliedDocType && needsRecShop ? (
        <p
          className={`py-8 text-center ${themeEmptyState}`}
          data-testid="voucher-inquiry-rec-shop-required"
        >
          {REC_SHOP_REQUIRED_MESSAGE}
        </p>
      ) : null}

      {!loading && !error && canShowResults ? (
        <VoucherInquiryResultsTable
          documents={documents}
          total={total}
          page={pageInfo.page}
          totalPages={pageInfo.totalPages}
          listReturnPath={listReturnPath}
          onPageChange={handlePageChange}
        />
      ) : null}
    </div>
  )
}
