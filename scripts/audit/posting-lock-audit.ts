import { runAudits } from "./lib/scan"
import { runPostingLockAudits } from "./lib/rules"

export { runPostingLockAudits } from "./lib/rules"

export function main(): boolean {
  return runAudits(() => runPostingLockAudits(), { exitOnFail: true })
}

if (require.main === module) {
  main()
}
