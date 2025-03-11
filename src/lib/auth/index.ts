import { expo } from "@better-auth/expo"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import db from "../../db/connection"
import * as authSchema from "../../db/schema.auth"

export const auth = betterAuth({
  //trustedOrigins: ["slash://", Bun.env.FRONTEND_URL!],
  trustedOrigins: ["slash://", "*"],
  plugins: [expo()],
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
  // socialProviders: {
  //   /*
  //    * We're using Google and Github as our social provider,
  //    * make sure you have set your environment variables
  //    */
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!
  //   },
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!
  //   }
  // }
})

export async function checkAndGetSession(headers: Headers) {
  const session = await auth.api.getSession({ headers })

  if (!session) throw new Error("Unauthorized")

  return session
}
