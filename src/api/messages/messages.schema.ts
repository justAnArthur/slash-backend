import { chat } from "@/src/api/chats/chats.schema"
import { user } from "@/src/api/users/users.schema"
import { file } from "@/src/db/schema"
import { relations } from "drizzle-orm/relations"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const MESSAGE_STORING_TYPE = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  JSON: "JSON"
} as const

export type Message = typeof message.$inferSelect

export const message = sqliteTable("message", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  createdAt: integer("createdAt", {
    mode: "timestamp"
  })
    .notNull()
    .$defaultFn(() => new Date()),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id),
  chatId: text("chat_id")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  type: text("type").notNull().default(MESSAGE_STORING_TYPE.TEXT),
  content: text("content")
})

export const messageRelations = relations(message, ({ one, many }) => ({
  sender: one(user, {
    fields: [message.senderId],
    references: [user.id]
  }),
  attachments: many(messageAttachment)
}))

export const messageAttachment = sqliteTable("message_attachment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  messageId: text("message_id")
    .notNull()
    .references(() => message.id, { onDelete: "cascade" }),
  [`${MESSAGE_STORING_TYPE.IMAGE}FileId`]: text("image_file_id").references(
    () => file.id,
    { onDelete: "set null" }
  ),
  [`${MESSAGE_STORING_TYPE.JSON}`]: text("json")
})
