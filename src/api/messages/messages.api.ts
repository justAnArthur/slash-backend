import { insertFile } from "@/src/api/file/files.api"
import { db } from "@/src/db/connection"
import { type Message, message, messageAttachment, user } from "@/src/db/schema"
import { checkAndGetSession } from "@/src/lib/auth"
import { desc, eq, inArray, sql } from "drizzle-orm"
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

      const messageIds = messages.map((m) => m.id)

      const attachmentRecords = await db
        .select({
          id: messageAttachment.id,
          messageId: messageAttachment.messageId,
          IMAGEFileId: messageAttachment.IMAGEFileId,
          JSON: messageAttachment.JSON
        })
        .from(messageAttachment)
        .where(inArray(messageAttachment.messageId, messageIds))

      const attachmentsByMessageId = attachmentRecords.reduce(
        (acc, att) => {
          if (!acc[att.messageId]) {
            acc[att.messageId] = []
          }
          acc[att.messageId].push(att)
          return acc
        },
        {} as Record<string, typeof attachmentRecords>
      )

      const messagesWithAttachments = messages.map((msg) => ({
        ...msg,
        attachments: attachmentsByMessageId[msg.id] || []
      }))

      const totalMessages = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(message)
        .where(eq(message.chatId, chatId))

      return {
        messages: messagesWithAttachments,
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
      request
    }: {
      params: { chatId: string }
      request: Context["request"]
    }) => {
      const session = await checkAndGetSession(request.headers)
      const senderId = session.user.id

      const formData = await request.formData()
      const type = formData.get("type")
      const _content = formData.get("content")

      console.log([...formData.keys()])
      console.log("insertedMessage", _content)

      if (!_content) throw new Error("Content is required")

      const messageValues = {
        chatId,
        senderId,
        type,
        content: type === MessageType.TEXT ? _content.toString() : null
      } as Message

      const [insertedMessage] = await db
        .insert(message)
        .values(messageValues)
        .returning()

      switch (type) {
        case MessageType.IMAGE: {
          const file = await insertFile(_content as File)
          await db.insert(messageAttachment).values({
            messageId: insertedMessage.id,
            IMAGEFileId: file.id
          })
          break
        }
        case MessageType.LOCATION: {
          console.log("Location", {
            messageId: insertedMessage.id,
            JSON: String(_content)
          })
          await db.insert(messageAttachment).values({
            messageId: insertedMessage.id,
            JSON: String(_content)
          })
          break
        }
      }

      return insertedMessage
    }
  )

const MessageType = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  LOCATION: "LOCATION"
} as const

export type MessageResponse = {
  id: string
  content: string | null
  type: keyof typeof MessageType
  senderId: string
  createdAt: string
  name: string
  isMe: boolean
  image: any
  attachments: MessageAttachmentResponse[]
}

export type MessageAttachmentResponse = {
  id: string
  messageId: string
  IMAGEFileId?: string | null
  JSON?: string | null
}

export type PaginatedMessageResponse = {
  messages: MessageResponse[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}
