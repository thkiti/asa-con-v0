"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { buildCloseEvidenceHistoryPath, buildCloseEvidencePath } from "@/lib/finance-ui/close-evidence"
import { buildCloseReadinessPath } from "@/lib/finance-ui/close-readiness"
import {
  buildOpeningBalanceReviewPath,
  isOpeningBalancePeriodKey,
} from "@/lib/finance-ui/opening-balance-review"
import { buildPeriodAuditTimelinePath } from "@/lib/finance-ui/period-audit-timeline"
import {
  fetchCloseReadiness,
  fetchReopenRequests,
  fetchSessionDisplay,
  patchAccountingPeriod,
  postReopenRequest,
  type PeriodAction,
} from "@/lib/finance-ui/period-fetchers"
import { getPeriodActionErrorDetails } from "@/lib/finance-ui/period-errors"
import { buildReopenEvidencePath } from "@/lib/finance-ui/reopen-evidence"
import { buildReopenRequestsPath, type ReopenRequestDetail } from "@/lib/finance-ui/reopen-requests"
import type { AccountingPeriodRow, SessionDisplay } from "@/lib/finance-ui/types"
import { CloseGateBlockerList } from "./CloseGateBlockerList"
import { PeriodAdminActions } from "./PeriodAdminActions"
import { PeriodStatusBadge } from "./PeriodStatusBadge"
import {
  themeBannerError,
  themeBannerSuccess,
  themeBannerWarning,
  themeLinkPrimary,
  themeLoadingText,
  themeSectionTitle,
  themeTextPrimary,
  themeTextSecondary,
} from "@/lib/finance-ui/finance-visual-classes"

type PeriodReviewPageProps = {
  periodId: string
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function PeriodReviewPage({ periodId }: PeriodReviewPageProps) {
  const [period, setPeriod] = useState<AccountingPeriodRow | null>(null)
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(null)
  const [pendingReopenRequest, setPendingReopenRequest] =
    useState<ReopenRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<
    ReturnType<typeof getPeriodActionErrorDetails> & {
      periodId?: string
      branchId?: string
      periodKey?: string
    } | null
  >(null)

  const loadPeriod = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCloseReadiness(periodId)
      const readinessPeriod = result.readiness.period
      setPeriod({
        id: readinessPeriod.id,
        periodKey: readinessPeriod.periodKey,
        legalEntityCode: readinessPeriod.legalEntityCode,
        branchId: readinessPeriod.branchId,
        branchName: "",
        status: readinessPeriod.status,
        openedAt: "",
        closedAt: readinessPeriod.closedAt,
      })

      if (readinessPeriod.status === "HARD_CLOSED") {
        try {
          const pending = await fetchReopenRequests(periodId, { status: "PENDING" })
          setPendingReopenRequest(pending.requests[0] ?? null)
        } catch {
          setPendingReopenRequest(null)
        }
      } else {
        setPendingReopenRequest(null)
      }
    } catch (err) {
      setPeriod(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadPeriod()
  }, [loadPeriod])

  useEffect(() => {
    void fetchSessionDisplay().then(setSessionDisplay)
  }, [])

  async function handleReopenRequest(reason: string) {
    if (!period) return
    setMessage(null)
    setError(null)
    setActionError(null)
    setPendingAction(true)
    try {
      const result = await postReopenRequest({ periodId: period.id, reason })
      setMessage(
        `Reopen request ${result.request.requestNo} submitted for period ${period.periodKey}`
      )
      await loadPeriod()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
      throw err
    } finally {
      setPendingAction(false)
    }
  }

  async function handlePeriodAction(
    action: PeriodAction,
    options?: { reason?: string }
  ) {
    if (!period) return
    setMessage(null)
    setError(null)
    setActionError(null)
    setPendingAction(true)
    try {
      const result = await patchAccountingPeriod({
        periodKey: period.periodKey,
        action,
        reason: options?.reason,
      })
      if (result.hardCloseAdvance?.outcome === "warning") {
        setMessage(
          `Period ${result.period.periodKey} is now ${result.period.status}. ${result.hardCloseAdvance.message}`
        )
      } else if (result.hardCloseAdvance?.outcome === "created") {
        setMessage(
          `Period ${result.period.periodKey} is now ${result.period.status}. Next period ${result.hardCloseAdvance.nextPeriodKey} opened automatically.`
        )
      } else {
        setMessage(`Period ${result.period.periodKey} is now ${result.period.status}`)
      }
      await loadPeriod()
    } catch (err) {
      const details = getPeriodActionErrorDetails(err)
      setError(details.message)
      if (details.blockers?.length || details.code) {
        setActionError({
          ...details,
          periodId: period.id,
          branchId: period.branchId,
          periodKey: period.periodKey,
        })
      }
      throw err
    } finally {
      setPendingAction(false)
    }
  }

  if (loading && !period) {
    return <p className={themeLoadingText}>Loading period…</p>
  }

  if (error && !period) {
    return <p className={themeBannerError}>{error}</p>
  }

  if (!period) {
    return null
  }

  const controlsDisabled = loading || pendingAction

  return (
    <div className="w-full space-y-6">
      <section className="w-full rounded border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`text-xs uppercase tracking-wide ${themeTextSecondary}`}>
              Accounting period
            </p>
            <h2 className={`mt-1 text-lg font-semibold ${themeTextPrimary}`}>
              {period.periodKey}
            </h2>
            <p className={`mt-1 text-sm ${themeTextSecondary}`}>
              Branch {period.branchId}
              {period.closedAt ? ` · Closed ${formatDate(period.closedAt)}` : null}
            </p>
          </div>
          <PeriodStatusBadge status={period.status} />
        </div>
      </section>

      <section className="w-full space-y-3">
        <h3 className={themeSectionTitle}>Review &amp; audit</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href={
              isOpeningBalancePeriodKey(period.periodKey)
                ? buildOpeningBalanceReviewPath(period.id)
                : buildCloseReadinessPath(period.id)
            }
            className={`text-sm font-medium ${themeLinkPrimary}`}
          >
            {isOpeningBalancePeriodKey(period.periodKey)
              ? "Opening balance review"
              : "Close readiness review"}
          </Link>
          <Link
            href={buildPeriodAuditTimelinePath(period.id)}
            className={`text-sm font-medium ${themeLinkPrimary}`}
          >
            Audit timeline
          </Link>
          <Link
            href={buildReopenEvidencePath(period.id)}
            className={`text-sm font-medium ${themeLinkPrimary}`}
          >
            Reopen history
          </Link>
          {period.status === "HARD_CLOSED" ? (
            <>
              <Link
                href={buildCloseEvidencePath(period.id)}
                className={`text-sm font-medium ${themeLinkPrimary}`}
              >
                Close evidence
              </Link>
              <Link
                href={buildCloseEvidenceHistoryPath(period.id)}
                className={`text-sm font-medium ${themeLinkPrimary}`}
              >
                Close history
              </Link>
              <Link
                href={buildReopenRequestsPath(period.id)}
                className={`text-sm font-medium ${themeLinkPrimary}`}
              >
                Reopen requests
              </Link>
            </>
          ) : null}
        </div>
      </section>

      <section className="w-full space-y-3">
        <h3 className={themeSectionTitle}>Period actions</h3>
        {sessionDisplay ? (
          <p className={`text-sm ${themeTextSecondary}`}>
            Signed in as {sessionDisplay.name || "Unknown"} ({sessionDisplay.role})
          </p>
        ) : null}
        {isOpeningBalancePeriodKey(period.periodKey) ? (
          period.status !== "HARD_CLOSED" ? (
            <p className={`text-sm ${themeTextSecondary}`}>
              Lock this bootstrap opening balance period from the Opening balance
              review page.
            </p>
          ) : null
        ) : (
          <PeriodAdminActions
            period={period}
            sessionRole={sessionDisplay?.role}
            pendingReopenRequest={pendingReopenRequest}
            disabled={controlsDisabled}
            submitting={pendingAction}
            onAction={handlePeriodAction}
            onReopenRequest={handleReopenRequest}
          />
        )}
      </section>

      {message ? <p className={themeBannerSuccess}>{message}</p> : null}

      {error ? (
        <div className={themeBannerError}>
          <p>{error}</p>
          {actionError?.blockers?.length ? (
            <div className={`mt-3 ${themeTextPrimary}`}>
              <CloseGateBlockerList
                blockers={actionError.blockers}
                title="Hard close rejected"
                errorCode={actionError.code}
                readinessStatus={actionError.readinessStatus}
                context={{
                  periodId: actionError.periodId,
                  branchId: actionError.branchId,
                  periodKey: actionError.periodKey,
                  latestSnapshotId: actionError.blockers.find(
                    (blocker) => blocker.refs?.snapshotId
                  )?.refs?.snapshotId,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {pendingReopenRequest ? (
        <p className={themeBannerWarning}>
          Pending reopen request {pendingReopenRequest.requestNo}.{" "}
          <Link href={buildReopenRequestsPath(period.id)} className={themeLinkPrimary}>
            Review requests
          </Link>
        </p>
      ) : null}
    </div>
  )
}
