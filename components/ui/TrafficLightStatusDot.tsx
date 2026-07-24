"use client"

export type TrafficLightStatus = "action_required" | "in_progress" | "completed"

export type TrafficLightStatusDotProps = {
  status: TrafficLightStatus
  /** Exact business status for tooltip / accessible name (required by standard). */
  tooltip: string
  className?: string
  "data-testid"?: string
}

const STATUS_DOT_CLASS: Record<TrafficLightStatus, string> = {
  action_required: "bg-[var(--tone-error-fg)]",
  in_progress: "bg-[var(--tone-warning-fg,#ca8a04)]",
  completed: "bg-[var(--tone-success-fg)]",
}

/**
 * ASA-CON traffic-light status indicator (red / yellow / green).
 * @see docs/ASA_CON_UI_STATUS_NAVIGATION_STANDARD.md §1
 */
export function TrafficLightStatusDot({
  status,
  tooltip,
  className = "",
  "data-testid": testId,
}: TrafficLightStatusDotProps) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]} ${className}`.trim()}
      title={tooltip}
      aria-label={tooltip}
      role="img"
      data-testid={testId}
    />
  )
}
