<<<<<<< HEAD
import type { Config } from "drizzle-kit"

export default {
  schema: "src/db/schema.ts",
  out: "./sqlite/migrations",
  driver: "better-sqlite",
  dbCredentials: {
    // Bun.env.DB workaround because Bun.env.DB does not work for drizzle-kit, currently throwing ReferenceError: Bun is not defined
    url: process.env.DB || "sqlite/slash.sqlite"
  }
} satisfies Config
=======
import type { Config } from "drizzle-kit"

export default {
  schema: "src/db/schema.ts",
  out: "./sqlite/migrations",
  driver: "better-sqlite",
  dbCredentials: {
    // Bun.env.DB workaround because Bun.env.DB does not work for drizzle-kit, currently throwing ReferenceError: Bun is not defined
    url: process.env.DB || "sqlite/slash.sqlite"
  }
} satisfies Config
>>>>>>> f1512508ccdd0b385954abcb99defa0a11f24a35
