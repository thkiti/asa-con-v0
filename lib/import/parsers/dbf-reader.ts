import { DBFFile } from "dbffile"

export async function readDbfRecords(filePath: string): Promise<Record<string, unknown>[]> {
  const dbf = await DBFFile.open(filePath)
  const records = await dbf.readRecords()
  return records as Record<string, unknown>[]
}
