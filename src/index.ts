import { handleBetterAuthRoute } from "@/src/lib/auth/handle-route"
import { authMiddleware } from "@/src/lib/auth/middleware"
import swaggerConfig from "@/src/lib/swagger.config"
import cors from "@elysiajs/cors"
import swagger from "@elysiajs/swagger"
import { logger } from "@tqman/nice-logger"
import { Elysia } from "elysia"

export const app = new Elysia({
  serve: { hostname: Bun.env.HOSTNAME || "localhost" }
})
  .use(
    logger({
      mode: "live",
      withTimestamp: true
    })
  )
  .use(swagger(swaggerConfig))
  .use(cors(/*corsConfig*/))
  .get("/", () => "Hello Elysia! 🦊")
  .all("/api/auth/*", handleBetterAuthRoute)
  .group("", { beforeHandle: authMiddleware }, (app) =>
    app.get("/secured", () => "Secured 🔗🦊", {
      detail: {
        description: "This is a secured route"
      }
    })
  )
  .listen(Bun.env.PORT || 3000)

export type App = typeof app

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
