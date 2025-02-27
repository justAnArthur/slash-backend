import db from "@/src/db/connection"
import { user } from "@/src/db/schema.auth"
import { like } from "drizzle-orm"
import Elysia from "elysia"

const PAGE_SIZE = 10

export default new Elysia({ prefix: "/users" }).get(
  "/search",
  async ({ query }: { query: { q: string; page: number } }) => {
    const { q, page = 1 } = query

    const offset = (Number(page) - 1) * PAGE_SIZE

    return db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(user)
      .where(like(user.name, `%${q}%`))
      .limit(PAGE_SIZE)
      .offset(offset)
  }
)
