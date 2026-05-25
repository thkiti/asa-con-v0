import { runAudits } from "./lib/scan"
import { runArchitectureAudits } from "./lib/rules"

export { runArchitectureAudits } from "./lib/rules"

function parseArgs(argv: string[]): { all: boolean } {
  const all = argv.includes("--all") || argv.length === 0 || !argv.some((a) => a.startsWith("--"))
  return { all }
}

export function main(argv: string[] = process.argv.slice(2)): boolean {
  const { all } = parseArgs(argv)
  if (!all) {
    console.error("Unknown flags. Use --all (default) to run every architecture audit.")
    process.exit(2)
  }

  return runAudits(() => runArchitectureAudits(), { exitOnFail: true })
}

if (require.main === module) {
  main()
}
