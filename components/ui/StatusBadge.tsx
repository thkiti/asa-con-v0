"use client"

import type { ReactNode } from "react"

/**
 * Visual tones for StatusBadge. Domain modules map business statuses → tones.
 * Do not put finance/stock/workflow status enum names in this module.
 */
export type StatusBadgeTone =
  | "neutral"
  | "info"
  | "accent"
  | "progress"
  | "received"
  | "success"
  | "ok"
  | "warning"
  | "caution"
  | "danger"
  | "muted"
  | "special"

export const STATUS_BADGE_TONE_CLASSES: Record<StatusBadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-800",
  info: "bg-blue-100 text-blue-800",
  accent: "bg-indigo-100 text-indigo-800",
  progress: "bg-cyan-100 text-cyan-800",
  received: "bg-teal-100 text-teal-800",
  success: "bg-emerald-100 text-emerald-800",
  ok: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  caution: "bg-orange-100 text-orange-800",
  danger: "bg-red-100 text-red-800",
  muted: "bg-slate-100 text-slate-800",
  special: "bg-purple-100 text-purple-800",
}

export type StatusBadgeProps = {
  tone: StatusBadgeTone
  children: ReactNode
  /** `xs` = text-xs (voucher lists); `sm` = text-sm (period/admin). */
  size?: "xs" | "sm"
  className?: string
  "data-testid"?: string
}

/**
 * Shared status chip chrome. Domain badges supply tone + label only.
 */
export function StatusBadge({
  tone,
  children,
  size = "xs",
  className = "",
  "data-testid": testId,
}: StatusBadgeProps) {
  const sizeClass = size === "sm" ? "text-sm" : "text-xs"
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-medium ${sizeClass} ${STATUS_BADGE_TONE_CLASSES[tone]} ${className}`.trim()}
      data-testid={testId}
    >
      {children}
    </span>
  )
}
