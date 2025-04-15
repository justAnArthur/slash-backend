import { insertFile } from "@/src/api/file/files.api"
import { db } from "@/src/db/connection"
import { type Message, message, messageAttachment, user } from "@/src/db/schema"
import { checkAndGetSession } from "@/src/lib/auth"
import { broadcastMessage } from "@/src/api/chats/chats.state"
import { desc, eq, inArray, sql } from "drizzle-orm"
import { type Context, Elysia, t } from "elysia"
import { notifyChatUsers } from "@/src/api/chats/push-message"

export default new Elysia({ prefix: "messages" })
  .get(
    "/:chatId",
    async ({
      params: { chatId },
      query
    }: {
      params: { chatId: string }
      query: { page: number; pageSize: number }
    }) => {
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
          image: user.image
        })
        .from(message)
        .leftJoin(user, eq(user.id, message.senderId))
        .where(eq(message.chatId, chatId))
        .orderBy(desc(message.createdAt))
        .limit(pageSize)
        .offset(offset)

      const messageIds = messages.length > 0 ? messages.map((m) => m.id) : []

      const attachmentRecords =
        messageIds.length > 0
          ? await db
              .select({
                id: messageAttachment.id,
                messageId: messageAttachment.messageId,
                IMAGEFileId: messageAttachment.IMAGEFileId,
                JSON: messageAttachment.JSON
              })
              .from(messageAttachment)
              .where(inArray(messageAttachment.messageId, messageIds))
          : []

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
    },
    {
      detail: {
        description: "Get messages by chat ID."
      },
      params: t.Object({
        chatId: t.String()
      }),
      query: t.Object({
        page: t.Number({ default: 1 }),
        pageSize: t.Number({ default: 20 })
      })
    }
  )
  .post(
    "/:chatId",
    async ({
      params: { chatId },
      error,
      request
    }: {
      params: { chatId: string }
      error: Context["error"]
      request: Context["request"]
    }) => {
      const session = await checkAndGetSession(request.headers)
      const senderId = session.user.id

      const formData = await request.formData()
      const type = formData.get("type")
      const _content = formData.get("content")

      if (!_content) error(400, "CONTENT_IS_REQUIRED")

      const messageValues = {
        chatId,
        senderId,
        type,
        content: type === MessageType.TEXT ? _content?.toString() : null
      } as Message

      const [insertedMessage] = await db
        .insert(message)
        .values(messageValues)
        .returning({
          id: message.id,
          type: message.type,
          content: message.content,
          senderId: message.senderId,
          createdAt: message.createdAt
        })

      const attachments: MessageAttachmentResponse[] = []
      switch (type) {
        case MessageType.IMAGE: {
          const file = await insertFile(_content as File)

          const [attachment] = await db
            .insert(messageAttachment)
            .values({
              messageId: insertedMessage.id,
              IMAGEFileId: file.id
            })
            .returning({
              id: messageAttachment.id,
              messageId: messageAttachment.messageId,
              IMAGEFileId: messageAttachment.IMAGEFileId
            })
          attachments.push(attachment)
          break
        }
        case MessageType.LOCATION: {
          console.log("Location", {
            messageId: insertedMessage.id,
            JSON: String(_content)
          })
          const [attachment] = await db
            .insert(messageAttachment)
            .values({
              messageId: insertedMessage.id,
              JSON: String(_content)
            })
            .returning({
              id: messageAttachment.id,
              messageId: messageAttachment.messageId,
              JSON: messageAttachment.JSON
            })
          attachments.push(attachment)
          break
        }
      }

      const [sender] = await db
        .select({
          name: user.name,
          image: user.image
        })
        .from(user)
        .where(eq(user.id, senderId))
        .limit(1)

      // @ts-ignore
      const fullMessage: MessageResponse = {
        ...insertedMessage,
        attachments,
        name: sender.name,
        image: sender.image
      }

      broadcastMessage(chatId, fullMessage)
      // noinspection ES6MissingAwait
      notifyChatUsers(chatId, senderId, fullMessage)

      return fullMessage
    },
    {
      detail: {
        description: "Create a new message.",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["TEXT", "IMAGE", "LOCATION"] },
                  content: { type: "string" }
                },
                required: ["type", "content"]
              }
            }
          }
        }
      },
      params: t.Object({
        chatId: t.String()
      })
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
