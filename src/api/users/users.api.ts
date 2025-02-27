import db from "@/src/db/connection"
import { user } from "@/src/db/schema.auth"
import { auth } from "@/src/lib/auth"
import { eq, like } from "drizzle-orm"
import Elysia from "elysia"
import type { Context } from "elysia"
const PAGE_SIZE = 10

export default new Elysia({ prefix: "/users" })
  .get("/search", async (context: Context) => {
    const { query } = context
    const { q, page = 1 } = query

    //const session = await auth.api.getSession({
    //  headers: context.request.headers
    //})
    const offset = (Number(page) - 1) * PAGE_SIZE

    // TODO: fetch last messages for existing chats
    return db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(user)
      .where(like(user.name, `%${q}%`))
      .limit(PAGE_SIZE)
      .offset(offset)
  })
  .get(":id", async ({ params }: { params: { id: string } }) => {
    const { id } = params
    try {
      const [userToReturn] = await db
        .select({ id: user.id, name: user.name, image: user.image })
        .from(user)
        .where(eq(user.id, id))
      if (!userToReturn) {
        return {
          status: 404,
          message: "User not found"
        }
      }
      return userToReturn
    } catch (error) {
      console.error("Error fetching chat:", error)
      return {
        status: 500,
        message: "Internal server error"
      }
    }
  })
