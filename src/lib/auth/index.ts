import { expo } from "@better-auth/expo"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import db from "../../db/connection"
import * as authSchema from "../../db/schema.auth"

export const auth = betterAuth({
  //trustedOrigins: ["slash://", Bun.env.FRONTEND_URL!],
  trustedOrigins: ["slash://", "*"],
  plugins: [expo(), twoFactor()],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema
  }),
  advanced: {
    defaultCookieAttributes: {
      secure: true,
      sameSite: "none",
      partitioned: true
    }
  }
})

export async function checkAndGetSession(headers: Headers) {
  const session = await auth.api.getSession({ headers })

  if (!session) throw new Error("Unauthorized")

  return session
}
