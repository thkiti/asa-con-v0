/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot } from "react-dom/client"
import { RepairTicketPhotoList } from "@/components/thermal/RepairTicketPhotoList"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("RepairTicketPhotoList", () => {
  it("renders full filename in a wrapping row without truncate", () => {
    const fileName = "REP-SH001-202606-0007-01.jpg"
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<RepairTicketPhotoList fileNames={[fileName]} />)
    })

    const nameEl = container.querySelector(".repairTicketPhotoFileName")
    expect(nameEl?.textContent).toBe(fileName)
    expect(nameEl?.classList.contains("truncate")).toBe(false)
    expect(container.querySelector(".repairTicketPhotoIndex")?.textContent).toBe("1.")

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
