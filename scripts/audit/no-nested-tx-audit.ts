import { runAudits } from "./lib/scan"
import { runNestedTxAudits } from "./lib/rules"

export { runNestedTxAudits } from "./lib/rules"

export function main(): boolean {
  return runAudits(() => runNestedTxAudits(), { exitOnFail: true })
}

if (require.main === module) {
  main()
}
