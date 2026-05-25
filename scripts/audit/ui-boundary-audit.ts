import { runAudits } from "./lib/scan"
import { runUiBoundaryAudits } from "./lib/rules"

export { runUiBoundaryAudits } from "./lib/rules"

export function main(): boolean {
  return runAudits(() => runUiBoundaryAudits(), { exitOnFail: true })
}

if (require.main === module) {
  main()
}
