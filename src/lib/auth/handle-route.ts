import { auth } from "@/src/lib/auth/index"
import type { Context } from "elysia"

export function handleBetterAuthRoute(context: Context) {
  const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"]

  if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method))
    return auth.handler(context.request)

  context.error(405)
}
