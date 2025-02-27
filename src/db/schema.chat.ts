import { sql } from "drizzle-orm"
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./schema.auth"
// Chats table (1-to-1 chat between two users)
export const chats = sqliteTable("chats", {
  chatId: text("chat_id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  userId: text("user_id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7())
})

// Messages table (supports text & images)
export const messages = sqliteTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.chatId, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id),
  content: text("content"), // Text messages
  imageUrl: text("image_url"), // Image URL (nullable)
  timestamp: integer("timestamp")
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
})
