import { message } from "@/src/api/messages/messages.schema"
import db from "@/src/db/connection"
import { user } from "@/src/db/schema.auth"
import { checkAndGetSession } from "@/src/lib/auth"
import { and, count, desc, eq, exists, inArray, ne, sql } from "drizzle-orm"
import Elysia, { type Context } from "elysia"
import { chat, chatUser } from "./chats.schema"

interface CreateChatRequest {
  userIds: string[]
  name?: string
}

type ChatType = "private" | "group"

export default new Elysia({ prefix: "/chats" })
  .post(
    "/",
    async ({
      body,
      request
    }: {
      body: CreateChatRequest
      request: Context["request"]
    }) => {
      try {
        const session = await checkAndGetSession(request.headers)
        const userId = session.user.id as string
        const { userIds, name } = body

        if (!userIds || userIds.length === 0) throw new Error("Users required")

        const chatType: ChatType = userIds.length === 1 ? "private" : "group"

        if (chatType === "private") {
          const [existingChat] = await db
            .select()
            .from(chat)
            .innerJoin(chatUser, eq(chat.id, chatUser.chatId))
            .where(
              and(
                eq(chat.type, "private"),
                inArray(chatUser.userId, [userId, userIds[0]]),
                exists(
                  db
                    .select({ count: count() })
                    .from(chatUser)
                    .where(
                      and(
                        eq(chatUser.chatId, chat.id),
                        inArray(chatUser.userId, [userId, userIds[0]])
                      )
                    )
                    .groupBy(chatUser.chatId)
                    .having(eq(count(), 2))
                )
              )
            )
            .limit(1)

          if (existingChat) return { chatId: existingChat.chat.id }
        }

        const [newChat] = await db
          .insert(chat)
          .values({ type: chatType, name })
          .returning({ id: chat.id })

        await db.insert(chatUser).values([
          ...userIds.map((id) => ({
            chatId: newChat.id,
            userId: id,
            role: "member" as const
          })),
          { chatId: newChat.id, userId, role: "admin" as const }
        ])

        return { chatId: newChat.id }
      } catch (error) {
        console.error(error)
      }
    }
  )
  .get(
    "/",
    async ({
      query,
      request
    }: {
      query: { page: number; pageSize: number }
      request: Context["request"]
    }) => {
      const { page = 1, pageSize = 5 } = query
      const session = await checkAndGetSession(request.headers)
      const userId = session.user.id

      const offset = (Number(page) - 1) * pageSize

      const lastMessagesSubquery = db
        .select({
          chatId: message.chatId,
          latestCreatedAt: sql<number>`MAX(${message.createdAt})`.as(
            "latestCreatedAt"
          )
        })
        .from(message)
        .groupBy(message.chatId)
        .as("lastMessages")

      return db
        .select({
          id: chat.id,
          type: chat.type,
          name: sql`
            CASE WHEN ${chat.type} = 'private' THEN (
              SELECT ${user.name}
              FROM ${user}
              INNER JOIN ${chatUser} ON ${user.id} = ${chatUser.userId}
              WHERE ${chatUser.chatId} = ${chat.id}
                AND ${chatUser.userId} != ${userId}
            ) ELSE ${chat.name} END
          `.as("name"),
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            type: message.type,
            isMe: eq(message.senderId, userId)
          }
        })
        .from(chat)
        .innerJoin(chatUser, eq(chat.id, chatUser.chatId))
        .leftJoin(
          lastMessagesSubquery,
          eq(chat.id, lastMessagesSubquery.chatId)
        )
        .leftJoin(
          message,
          and(
            eq(message.chatId, chat.id),
            eq(message.createdAt, lastMessagesSubquery.latestCreatedAt)
          )
        )
        .where(eq(chatUser.userId, userId))
        .orderBy(desc(message.createdAt))
        .limit(pageSize)
        .offset(offset)
    }
  )
  .get(
    "/:id",
    async ({
      params,
      request
    }: {
      params: { id: string }
      request: Context["request"]
    }) => {
      try {
        const chatId = params.id
        const session = await checkAndGetSession(request.headers)
        const userId = session.user.id as string

        const participants = await db
          .select({
            userId: chatUser.userId,
            name: user.name,
            image: user.image
          })
          .from(chatUser)
          .innerJoin(user, eq(user.id, chatUser.userId))
          .where(and(eq(chatUser.chatId, chatId), ne(chatUser.userId, userId)))

        const [chatDetails] = await db
          .select({
            id: chat.id,
            type: chat.type,
            name: chat.name
          })
          .from(chat)
          .leftJoin(chatUser, eq(chat.id, chatUser.chatId))
          .leftJoin(message, eq(message.chatId, chatId))
          .where(eq(chat.id, chatId))
          .limit(1)

        if (!chatDetails) throw new Error("Chat not found")

        return { chat: { ...chatDetails, participants } as ChatResponse }
      } catch (error) {
        console.error(error)
        return { error }
      }
    }
  )

export type ChatResponse = {
  id: string
  name: string
  image: string | null
  type: string
  participants: { userId: string; name: string; image: string | null }[]
}
