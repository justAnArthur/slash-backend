<<<<<<< HEAD
import { afterAll, beforeAll, beforeEach } from "bun:test"
import { sql } from "drizzle-orm"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import db, { closeDb } from "../../src/db/connection"

beforeAll(() => {
  migrate(db, { migrationsFolder: "sqlite/migrations" })
})

beforeEach(() => {
  const queries = [
    "DELETE FROM articles",
    "DELETE FROM users",
    "DELETE FROM comments",
    "DELETE from tags",
    "DELETE from tagsArticles",
    "DELETE from userFollows"
  ]

  for (const q of queries) db.run(sql.raw(q))
})

afterAll(() => {
  closeDb()
})
=======
import { afterAll, beforeAll, beforeEach } from "bun:test"
import { sql } from "drizzle-orm"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import db, { closeDb } from "../../src/db/connection"

beforeAll(() => {
  migrate(db, { migrationsFolder: "sqlite/migrations" })
})

beforeEach(() => {
  const queries = [
    "DELETE FROM articles",
    "DELETE FROM users",
    "DELETE FROM comments",
    "DELETE from tags",
    "DELETE from tagsArticles",
    "DELETE from userFollows"
  ]

  for (const q of queries) db.run(sql.raw(q))
})

afterAll(() => {
  closeDb()
})
>>>>>>> f1512508ccdd0b385954abcb99defa0a11f24a35
