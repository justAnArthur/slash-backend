import { message } from "@/src/api/messages/messages.schema"
import { user } from "@/src/api/users/users.schema"
import db from "@/src/db/connection"
import { checkAndGetSession } from "@/src/lib/auth"
import {
  broadcastMessage,
  subscribeUsersToChat,
  unsubscribeAllFromChat,
  unsubscribeUserFromChat
} from "@/src/lib/chat.state"
import { and, count, desc, eq, exists, inArray, ne, sql } from "drizzle-orm"
import Elysia, { type Context } from "elysia"
import type {
  MessageAttachmentResponse,
  MessageResponse
} from "../messages/messages.api"
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

        subscribeUsersToChat(newChat.id, [...userIds, userId])
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
      query: { page: number; pageSize: number; pinned?: string }
      request: Context["request"]
    }) => {
      const session = await checkAndGetSession(request.headers)
      const userId = session.user.id

      const { page = 1, pageSize = 5, pinned: _pinned } = query
      const pinned = _pinned === "true"

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
            senderId: message.senderId,
            name: user.name,
            image: user.image
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
        .leftJoin(user, eq(message.senderId, user.id))
        .where(
          and(
            eq(chatUser.userId, userId),
            pinned ? eq(chatUser.pinned, true) : sql`true`
          )
        )
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
  .get(
    "/fetch/:id",
    async ({
      params,
      request
    }: {
      params: { id: string }
      request: Context["request"]
    }) => {
      const { id } = params
      const session = await checkAndGetSession(request.headers)
      const userId = session.user.id

      const lastMessagesSubquery = db
        .select({
          chatId: message.chatId,
          latestCreatedAt: sql<number>`MAX(${message.createdAt})`.as(
            "latestCreatedAt"
          )
        })
        .from(message)
        .where(eq(message.chatId, id))
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
            senderId: message.senderId,
            name: user.name,
            image: user.image
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
        .leftJoin(user, eq(message.senderId, user.id))
        .where(and(eq(chatUser.userId, userId), eq(chat.id, id)))
        .limit(1)
    }
  )
  .delete(
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

        const [chatDetails] = await db
          .select({ type: chat.type, role: chatUser.role })
          .from(chat)
          .innerJoin(chatUser, eq(chat.id, chatUser.chatId))
          .where(and(eq(chatUser.userId, userId), eq(chatUser.chatId, chatId)))

          .limit(1)
        if (!chatDetails) {
          return {
            error: "Chat not found or you do not have permission to delete it."
          }
        }
        const { type, role } = chatDetails
        if (type === "private" || role === "admin") {
          await db.delete(chat).where(eq(chat.id, chatId))
          unsubscribeAllFromChat(chatId)
        } else if (type === "group") {
          await db
            .delete(chatUser)
            .where(
              and(eq(chatUser.chatId, chatId), eq(chatUser.userId, userId))
            )
          const [systemMessage] = await db
            .insert(message)
            .values({
              chatId,
              senderId: "SYSTEM",
              type: "TEXT" as const,
              content: `${session.user.name} has left the chat.`
            })
            .returning()

          // @ts-ignore
          const fullMessage: MessageResponse = {
            ...systemMessage,
            attachments: [] as MessageAttachmentResponse[],
            name: "Info",
            image: null
          }
          unsubscribeUserFromChat(chatId, userId)
          broadcastMessage(chatId, fullMessage)
        }
        //TODO: add websocket chat deletion notificaiton
        // Optionally, handle WebSocket notifications here if needed
        // Example: broadcastChatDeletion(chatId);

        return { success: true, message: "Chat deleted successfully." }
      } catch (error) {
        console.error(error)
        return { error: "An error occurred while deleting the chat." }
      }
    }
  )
  .post(
    "/:id",
    async ({
      params,
      request,
      body
    }: {
      params: { id: string }
      request: Context["request"]
      body: { pinned?: boolean }
    }) => {
      await checkAndGetSession(request.headers)
      const chatId = params.id

      const { pinned } = body

      await db
        .update(chatUser)
        .set({ pinned: !!pinned })
        .where(eq(chatUser.chatId, chatId))
    }
  )

export type ChatResponse = {
  id: string
  name: string
  image: string | null
  type: "group" | "private"
  participants: { userId: string; name: string; image: string | null }[]
}
export type ChatListResponse = {
  id: string
  name: string
  image: string | null
  type: "group" | "private"
  lastMessage: MessageResponse
}
