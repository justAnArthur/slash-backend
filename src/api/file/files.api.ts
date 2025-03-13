import db from "@/src/db/connection"
import { file } from "@/src/db/schema"
import { Elysia } from "elysia"

export default new Elysia({ prefix: "files" }).get(
  "/:fileId",
  async ({ params: { fileId }, set, error }) => {
    const file = await getFileById(fileId)
    if (!file) return error(404, "File not found")

    console.log("file", file)

    set.headers["Content-Type"] = file.type || "application/octet-stream"
    set.headers["Content-Disposition"] = `attachment; filename="${file.name}"`

    return file
  }
)

const FILE_PATH = "./uploads" as const

function getFilePath(id: string) {
  return `${FILE_PATH}/${id}`
}

async function getFileById(fileId: string) {
  return Bun.file(getFilePath(fileId))
}

export async function insertFile(fileFile: File) {
  const arrayBuffer = await fileFile.arrayBuffer()
  const fileBytes = new Uint8Array(arrayBuffer)

  const id = Bun.randomUUIDv7()

  const path = getFilePath(id)

  await Bun.write(path, fileBytes)

  return db
    .insert(file)
    .values({ id, path })
    .returning()
    .then(([file]) => file)
}
