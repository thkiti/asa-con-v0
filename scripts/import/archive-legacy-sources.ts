/**
 * Archive legacy devboard source files into data/legacy/devboard-v1.
 *
 * Examples:
 *   npx tsx scripts/import/archive-legacy-sources.ts --source-dir=D:/_projects/asa-con/scripts --target-dir=data/legacy/devboard-v1
 *   npx tsx scripts/import/archive-legacy-sources.ts --dry-run
 */
import {
  buildLegacyArchiveManifest,
  parseLegacyArchiveCliArgs,
  printLegacyArchiveSummary,
} from "../../lib/import/archive"

async function main() {
  const options = parseLegacyArchiveCliArgs(process.argv.slice(2))
  const dryRun = options.dryRun ?? false

  if (dryRun) {
    console.log("Dry-run mode. No files will be copied and manifest.json will not be written.")
  }

  const result = await buildLegacyArchiveManifest(options)
  printLegacyArchiveSummary(result, dryRun)

  if (result.errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
