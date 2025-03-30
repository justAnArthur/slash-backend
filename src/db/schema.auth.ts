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

export const session = sqliteTable("session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  token: text("token").notNull(),
  expiresAt: integer("expiresAt", {
    mode: "timestamp"
  }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
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

export const account = sqliteTable("account", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", {
    mode: "timestamp"
  }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp"
  }),
  scope: text("scope"),
  password: text("password"),
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

export const verification = sqliteTable("verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", {
    mode: "timestamp"
  }).notNull(),
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
