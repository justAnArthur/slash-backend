import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./schema.auth"
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
  chatId: text("chat_id")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id),
  content: text("content"),
  imageUrl: text("image_url"),
  createdAt: integer("createdAt", {
    mode: "timestamp"
  })
    .notNull()
    .$defaultFn(() => new Date())
})
