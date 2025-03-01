import { db } from "@/src/db/connection"
import { message } from "@/src/db/schema"
import { auth } from "@/src/lib/auth"
import { desc, eq, sql } from "drizzle-orm"
import { Elysia } from "elysia"
import type { Context } from "elysia"

export default new Elysia({ prefix: "messages" })
  .get(
    "/:chatId",
    async ({
      params,
      query,
      request
    }: {
      params: { chatId: string }
      query: { page: number; pageSize: number }
      request: Context["request"]
    }) => {
      const session = await auth.api.getSession({
        headers: request.headers
      })
      const userId = session?.user.id as string

      const { chatId } = params
      const { page = 1, pageSize = 20 } = query // Default values
      const offset = (page - 1) * pageSize

      const messages = await db
        .select({
          id: message.id,
          createdAt: message.createdAt,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          isMe: eq(message.senderId, userId)
        })
        .from(message)
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
    "/",
    async ({
      body,
      request
    }: {
      body: {
        chatId: string
        content: string
        type: "TEXT" | "IMAGE" | "LOCATION"
      }
      request: Context["request"]
    }) => {
      const session = await auth.api.getSession({
        headers: request.headers
      })
      const senderId = session?.user.id
      const { chatId, content, type } = body
      if (!content) {
        return {
          status: 500,
          message: "Internal server error"
        }
      }
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
