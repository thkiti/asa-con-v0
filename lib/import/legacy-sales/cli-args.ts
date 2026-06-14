import type {
  LegacySalesConvertOptions,
  LegacySalesStageOptions,
  LegacySalesValidateOptions,
} from "./types"

export type LegacySalesCliCommand = "stage" | "validate" | "convert"

export type LegacySalesCliOptions = {
  command: LegacySalesCliCommand
  file?: string
  sourceDir?: string
  year: number
  batch?: string
  apply: boolean
}

function readFlagValue(argv: string[], flag: string): string | undefined {
  const direct = argv.find((arg) => arg.startsWith(`${flag}=`))
  if (direct) return direct.slice(flag.length + 1).trim() || undefined

  const index = argv.indexOf(flag)
  if (index >= 0) return argv[index + 1]?.trim() || undefined
  return undefined
}

export function parseLegacySalesCliArgs(argv: string[]): LegacySalesCliOptions {
  const commandArg = argv[0]
  const command =
    commandArg === "stage" || commandArg === "validate" || commandArg === "convert"
      ? commandArg
      : undefined

  if (!command) {
    throw new Error("Expected command: stage | validate | convert")
  }

  const yearRaw = readFlagValue(argv, "--year")
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : 2026
  if (!Number.isFinite(year)) {
    throw new Error(`Invalid --year value: ${yearRaw}`)
  }

  return {
    command,
    file: readFlagValue(argv, "--file"),
    sourceDir: readFlagValue(argv, "--source-dir"),
    year,
    batch: readFlagValue(argv, "--batch"),
    apply: argv.includes("--apply"),
  }
}

export function toStageOptions(
  cli: LegacySalesCliOptions,
  filePath: string,
  sourceFileName: string
): LegacySalesStageOptions {
  return {
    filePath,
    sourceFileName,
    year: cli.year,
    apply: cli.apply,
  }
}

export function toValidateOptions(cli: LegacySalesCliOptions, batchId: string): LegacySalesValidateOptions {
  return {
    batchId,
    apply: cli.apply,
  }
}

export function toConvertOptions(cli: LegacySalesCliOptions, batchId: string): LegacySalesConvertOptions {
  return {
    batchId,
    apply: cli.apply,
  }
}
