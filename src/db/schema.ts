import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export * from "./schema.auth"
export * from "@/src/api/chats/chats.schema"
export * from "@/src/api/messages/messages.schema"
export * from "@/src/api/users/users.schema"

export const file = sqliteTable("file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  path: text("path").notNull()
})
