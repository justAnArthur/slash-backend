import type { Context } from "elysia"
import { auth } from "."

export const authMiddleware = async (context: Context) => {
  const session = await auth.api.getSession({
    headers: context.request.headers
  })

  if (!session) return context.error(401)
}
