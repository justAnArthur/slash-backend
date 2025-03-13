import { user } from "@/src/db/schema.auth"
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const chat = sqliteTable("chat", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  type: text("type", { enum: ["private", "group"] })
    .notNull()
    .default("private"),
  name: text("name"),
  createdAt: integer("createdAt", {
    mode: "timestamp"
  })
    .notNull()
    .$defaultFn(() => new Date())
})

export const chatUser = sqliteTable(
  "chat_user",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member")
  },
  (table) => ({
    primaryKey: primaryKey(table.chatId, table.userId)
  })
)

export type Chat = typeof chat.$inferSelect
export type NewChat = typeof chat.$inferInsert

export type ChatUser = typeof chatUser.$inferSelect
export type NewChatUser = typeof chatUser.$inferInsert
