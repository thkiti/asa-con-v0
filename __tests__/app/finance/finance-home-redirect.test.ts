jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}))

import { redirect } from "next/navigation"
import Page from "@/app/(main)/finance/page"

describe("/finance home redirect", () => {
  it("redirects legacy finance home to the canonical hub", () => {
    Page()
    expect(redirect).toHaveBeenCalledWith("/main/finance")
  })
})
