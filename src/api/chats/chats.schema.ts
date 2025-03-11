import { user } from "@/src/db/schema.auth"
import { sqliteTable, text } from "drizzle-orm/sqlite-core"

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
