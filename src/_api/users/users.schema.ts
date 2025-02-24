import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import type { Static } from "elysia"
import { users } from "../../db/schema.auth"

export const userInsert = createInsertSchema(users)
export const userSelect = createSelectSchema(users)

export type UserInsert = Static<typeof userInsert>
export type User = Static<typeof userSelect>
