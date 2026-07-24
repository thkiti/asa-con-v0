import { renderToStaticMarkup } from "react-dom/server"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { TrafficLightStatusDot } from "@/components/ui/TrafficLightStatusDot"

describe("StatusBadge", () => {
  it("renders label with tone classes", () => {
    const html = renderToStaticMarkup(
      <StatusBadge tone="success" data-testid="badge">
        Posted
      </StatusBadge>
    )
    expect(html).toContain("Posted")
    expect(html).toContain("bg-emerald-100")
    expect(html).toContain('data-testid="badge"')
  })

  it("supports sm size for admin badges", () => {
    const html = renderToStaticMarkup(
      <StatusBadge tone="ok" size="sm">
        Open
      </StatusBadge>
    )
    expect(html).toContain("text-sm")
    expect(html).toContain("bg-green-100")
  })
})

describe("TrafficLightStatusDot", () => {
  it("maps action_required to error tone with accessible tooltip", () => {
    const html = renderToStaticMarkup(
      <TrafficLightStatusDot
        status="action_required"
        tooltip="New — not yet reviewed"
        data-testid="dot-new"
      />
    )
    expect(html).toContain("tone-error")
    expect(html).toContain('title="New — not yet reviewed"')
    expect(html).toContain('aria-label="New — not yet reviewed"')
    expect(html).toContain('data-testid="dot-new"')
  })

  it("maps in_progress and completed tones", () => {
    const yellow = renderToStaticMarkup(
      <TrafficLightStatusDot status="in_progress" tooltip="Draft" />
    )
    const green = renderToStaticMarkup(
      <TrafficLightStatusDot status="completed" tooltip="Posted" />
    )
    expect(yellow).toContain("tone-warning")
    expect(green).toContain("tone-success")
  })
})
