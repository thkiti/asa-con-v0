"use client"

import { parseTicketSetupTextPreviewLines } from "@/lib/admin/ticket-setup-text-preview"
import {
  TicketSetupDivider,
  TicketSetupDottedLine,
  TicketSetupLabelValueRow,
  TicketSetupMonoAmountRow,
  TicketSetupMonoLine,
  TicketSetupProportionalCentered,
  TicketSetupProportionalLine,
} from "@/components/admin/TicketSetupPreviewPrimitives"

export function ThermalTicketTextBody({
  text,
  testId,
}: {
  text: string
  testId?: string
}) {
  const lines = parseTicketSetupTextPreviewLines(text)

  return (
    <div
      className="receipt-setup-mono-body space-y-0.5 pt-0.5"
      data-testid={testId ?? "thermal-ticket-body"}
    >
      {lines.map((line, index) => {
        switch (line.kind) {
          case "blank":
            return <div key={index} className="h-1" aria-hidden />
          case "dashed-divider":
            return <TicketSetupDivider key={index} />
          case "dotted-divider":
            return <TicketSetupDottedLine key={index} />
          case "mono-amount":
            return (
              <TicketSetupMonoAmountRow
                key={index}
                left={line.left}
                right={line.right}
              />
            )
          case "mono-text":
            return <TicketSetupMonoLine key={index}>{line.text}</TicketSetupMonoLine>
          case "proportional-centered":
            return (
              <TicketSetupProportionalCentered key={index} bold>
                {line.text}
              </TicketSetupProportionalCentered>
            )
          case "proportional-label-value":
            return (
              <TicketSetupLabelValueRow
                key={index}
                label={line.label}
                value={line.value}
                stacked={line.stacked}
              />
            )
          case "proportional":
            return (
              <TicketSetupProportionalLine key={index}>{line.text}</TicketSetupProportionalLine>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
