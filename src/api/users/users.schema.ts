import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const user = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", {
    mode: "boolean"
  }).notNull(),
  image: text("image"),
  bio: text("bio"),
  twoFactorEnabled: integer("twoFactorEnabled", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("createdAt", {
    mode: "timestamp"
  })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", {
    mode: "timestamp"
  })
    .notNull()
    .$onUpdateFn(() => new Date())
})

export const device = sqliteTable("device", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  createdAt: integer("createdAt", {
    mode: "timestamp"
  })
    .notNull()
    .$defaultFn(() => new Date()),

  pushToken: text("pushToken").notNull(),

  brand: text("brand"),
  model: text("model"),
  osName: text("osName"),
  osVersion: text("osVersion"),
  deviceName: text("deviceName"),
  deviceYear: text("deviceYear")
})
