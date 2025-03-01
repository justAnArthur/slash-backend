import { user } from "@/src/db/schema.auth"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const privateChat = sqliteTable("private_chat", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  user1Id: text("user1_id")
    .notNull()
    .references(() => user.id),
  user2Id: text("user2_id")
    .notNull()
    .references(() => user.id)
})

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
    .references(() => privateChat.id, { onDelete: "cascade" }),
  content: text("content"),
  type: text("type").notNull().default("TEXT")
})
