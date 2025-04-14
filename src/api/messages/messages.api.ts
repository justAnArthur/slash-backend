import { insertFile } from "@/src/api/file/files.api"
import { db } from "@/src/db/connection"
import { type Message, message, messageAttachment, user } from "@/src/db/schema"
import { checkAndGetSession } from "@/src/lib/auth"
import { broadcastMessage } from "@/src/lib/chat.state"
import { desc, eq, inArray, sql } from "drizzle-orm"
import { type Context, Elysia, t } from "elysia"

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
      }),
      response: {
        200: t.Object({
          messages: t.Array(
            t.Object({
              id: t.String(),
              content: t.Union([t.String(), t.Null()]),
              type: t.String({
                description:
                  "The type of the message. Can be TEXT, IMAGE, or LOCATION."
              }),
              senderId: t.String(),
              createdAt: t.Any(),
              name: t.Nullable(t.String()),
              image: t.Any(),
              attachments: t.Array(
                t.Object({
                  id: t.String(),
                  messageId: t.String(),
                  IMAGEFileId: t.Union([t.String(), t.Null()]),
                  JSON: t.Union([t.String(), t.Null()])
                })
              )
            })
          ),
          pagination: t.Object({
            total: t.Number(),
            page: t.Number(),
            pageSize: t.Number(),
            totalPages: t.Number()
          })
        })
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

      // @ts-ignore
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
      return fullMessage
    },
    {
      detail: {
        description: "Create a new message."
      },
      params: t.Object({
        chatId: t.String()
      }),
      body: t.Object(
        {
          type: t.Union([
            t.Literal("TEXT"),
            t.Literal("IMAGE"),
            t.Literal("LOCATION")
          ]),
          content: t.Union([t.String(), t.File()])
        },
        {
          description: "FormData with type and content."
        }
      )
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
