import db from "@/src/db/connection"
import { auth } from "@/src/lib/auth"
import { and, eq, or } from "drizzle-orm"
import Elysia, { type Context } from "elysia"
import { privateChat } from "./chats.schema"

export default new Elysia({ prefix: "/chats" }).post(
  "/start",
  async (context: Context) => {
    const session = await auth.api.getSession({
      headers: context.request.headers
    })

    console.log(context)
    const user2Id = session?.user.id as string
    const { user1Id } = context.body.body as { user1Id: string }

    if (user1Id === user2Id) {
      return new Response("Cannot create a chat with yourself", {
        status: 400
      })
    }
    console.log(user1Id, user2Id)
    try {
      const existingChat = await db
        .select()
        .from(privateChat)
        .where(
          or(
            and(
              eq(privateChat.user1Id, user1Id),
              eq(privateChat.user2Id, user2Id)
            ),
            and(
              eq(privateChat.user1Id, user2Id),
              eq(privateChat.user2Id, user1Id)
            )
          )
        )
        .limit(1)

      if (existingChat.length > 0) {
        return { chatId: existingChat[0].id }
      }

      const [newChat] = await db
        .insert(privateChat)
        .values({ user1Id, user2Id }) // Use snake_case here
        .returning({ id: privateChat.id })

      return { chatId: newChat.id }
    } catch (error) {
      console.error("Error creating chat:", error)
      return new Response("Internal server error", { status: 500 })
    }
  }
)
