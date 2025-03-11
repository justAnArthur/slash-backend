import { db } from "@/src/db/connection"
import { message, user } from "@/src/db/schema"
import { checkAndGetSession } from "@/src/lib/auth"
import { desc, eq, sql } from "drizzle-orm"
import type { Context } from "elysia"
import { Elysia } from "elysia"

export default new Elysia({ prefix: "messages" })
  .get(
    "/:chatId",
    async ({
      params: { chatId },
      query,
      request
    }: {
      params: { chatId: string }
      query: { page: number; pageSize: number }
      request: Context["request"]
    }) => {
      const session = await checkAndGetSession(request.headers)
      const userId = session.user.id

      const { page = 1, pageSize = 20 } = query
      const offset = (page - 1) * pageSize

      const messages = await db
        .select({
          id: message.id,
          createdAt: message.createdAt,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          name: user.name,
          isMe: eq(message.senderId, userId),
          image: user.image
        })
        .from(message)
        .innerJoin(user, eq(user.id, message.senderId))
        .where(eq(message.chatId, chatId))
        .orderBy(desc(message.createdAt))
        .limit(pageSize)
        .offset(offset)

      const totalMessages = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(message)
        .where(eq(message.chatId, chatId))

      return {
        messages,
        pagination: {
          total: totalMessages[0]?.count || 0,
          page: page,
          pageSize: pageSize,
          totalPages: Math.ceil((totalMessages[0]?.count || 0) / pageSize)
        }
      }
    }
  )
  .post(
    "/:chatId",
    async ({
      params: { chatId },
      body: { content, type },
      request
    }: {
      params: { chatId: string }
      body: {
        chatId: string
        content: string
        type: "TEXT" | "IMAGE" | "LOCATION"
      }
      request: Context["request"]
    }) => {
      const session = await checkAndGetSession(request.headers)
      const senderId = session.user.id

      if (!content) throw new Error("Content is required")

      const [newMessage] = await db
        .insert(message)
        .values({
          chatId,
          senderId,
          content,
          type
        })
        .returning()

      return newMessage
    }
  )
