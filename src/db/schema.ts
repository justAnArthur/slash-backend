import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export * from "./schema.auth"
export * from "../api/chats/chats.schema"
export * from "../api/messages/messages.schema"

export const file = sqliteTable("file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  path: text("path").notNull()
})
export { user } from "@/src/api/users/users.schema"
