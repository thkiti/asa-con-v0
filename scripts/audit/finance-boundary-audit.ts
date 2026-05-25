import { runAudits } from "./lib/scan"
import { runFinanceBoundaryAudits } from "./lib/rules"

export { runFinanceBoundaryAudits } from "./lib/rules"

export function main(): boolean {
  return runAudits(() => runFinanceBoundaryAudits(), { exitOnFail: true })
}

if (require.main === module) {
  main()
}
