import { chat } from "@/src/api/chats/chats.schema"
import { user } from "@/src/db/schema.auth"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
  content: text("content"),
  type: text("type").notNull().default("TEXT")
})

export type Message = typeof message.$inferSelect
export type NewMessage = typeof message.$inferInsert
