import { roleLandingPath } from "@/lib/permissions/roles"
import { BRANCH_STAFF_LANDING_PATH } from "@/lib/main-ui/landing-paths"

describe("roleLandingPath", () => {
  it("sends HO roles to main menu", () => {
    expect(roleLandingPath("HO_ADMIN")).toBe("/main")
    expect(roleLandingPath("HO_FINANCE")).toBe("/main")
    expect(roleLandingPath("HO_OPERATIONS")).toBe("/main")
  })

  it("sends SH_STAFF to branch working screen", () => {
    expect(roleLandingPath("SH_STAFF")).toBe(BRANCH_STAFF_LANDING_PATH)
  })
})
