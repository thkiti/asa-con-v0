import { createHash } from "crypto"
import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"

export async function sha256File(filePath: string): Promise<string> {
  const buffer = await fsPromises.readFile(filePath)
  return createHash("sha256").update(buffer).digest("hex")
}

export async function fileSizeBytes(filePath: string): Promise<number> {
  const stat = await fsPromises.stat(filePath)
  return stat.size
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}

export function pathExistsSync(filePath: string): boolean {
  return fs.existsSync(filePath)
}

export async function ensureArchiveDirectories(targetRoot: string): Promise<void> {
  await fsPromises.mkdir(path.join(targetRoot, "dbf"), { recursive: true })
  await fsPromises.mkdir(path.join(targetRoot, "csv"), { recursive: true })
  await fsPromises.mkdir(path.join(targetRoot, "reports"), { recursive: true })
  await fsPromises.mkdir(path.join(targetRoot, "notes"), { recursive: true })
}

export async function copyFilePreserveName(
  sourcePath: string,
  archivePath: string
): Promise<void> {
  await fsPromises.mkdir(path.dirname(archivePath), { recursive: true })
  await fsPromises.copyFile(sourcePath, archivePath)
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true })
  await fsPromises.writeFile(filePath, JSON.stringify(value, null, 2), "utf8")
}
