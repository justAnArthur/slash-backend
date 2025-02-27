import { user } from "@/src/db/schema.auth"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const chat = sqliteTable("chat", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  userId: text("user_id")
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
    .references(() => chat.id, { onDelete: "cascade" }),
  content: text("content"),
  imageUrl: text("image_url")
})
