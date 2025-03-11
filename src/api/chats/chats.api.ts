import { message } from "@/src/api/messages/messages.schema"
import db from "@/src/db/connection"
import { user } from "@/src/db/schema.auth"
import { auth, checkAndGetSession } from "@/src/lib/auth"
import { and, desc, eq, or, sql } from "drizzle-orm"
import Elysia, { type Context } from "elysia"
import { privateChat } from "./chats.schema"

export default new Elysia({ prefix: "/chats" })
  .post(
    "/start",
    async ({
      body,
      request
    }: { body: { user1Id: string }; request: Context["request"] }) => {
      const session = await checkAndGetSession(request.headers)

      const user2Id = session.user.id as string
      const { user1Id } = body

      if (user1Id === user2Id)
        throw new Error("Cannot create a chat with yourself")

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

      if (existingChat.length > 0) return { chatId: existingChat[0].id }

      const [newChat] = await db
        .insert(privateChat)
        .values({ user1Id, user2Id })
        .returning({ id: privateChat.id })

      await db.insert(message).values({
        chatId: newChat.id,
        senderId: user2Id,
        content: "Hello!",
        type: "TEXT"
      })

      return { chatId: newChat.id }
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
      const session = await auth.api.getSession({
        headers: request.headers
      })
      const currentUserId = session?.user.id as string

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
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            type: message.type,
            isMe: eq(message.senderId, currentUserId)
          },
          id: eq(privateChat.user1Id, currentUserId)
            ? privateChat.user1Id
            : privateChat.user2Id,
          name: eq(privateChat.user1Id, currentUserId) ? user.name : user.name,
          image: user.image
        })
        .from(privateChat)
        .innerJoin(
          lastMessagesSubquery,
          eq(privateChat.id, lastMessagesSubquery.chatId)
        )
        .innerJoin(
          message,
          and(
            eq(message.chatId, privateChat.id),
            eq(message.createdAt, lastMessagesSubquery.latestCreatedAt)
          )
        )
        .leftJoin(
          user,
          eq(
            user.id,
            eq(privateChat.user1Id, currentUserId)
              ? privateChat.user1Id
              : privateChat.user2Id
          )
        )
        .where(
          or(
            eq(privateChat.user1Id, currentUserId),
            eq(privateChat.user2Id, currentUserId)
          )
        )
        .orderBy(desc(message.createdAt))
        .limit(pageSize)
        .offset(offset)
    }
  )
