import chatRoutes from "@/src/api/chats/chats.api"
import fileRoutes from "@/src/api/file/files.api"
import messageRoutes from "@/src/api/messages/messages.api"
import userRoutes from "@/src/api/users/users.api"
import { handleBetterAuthRoute } from "@/src/lib/auth/handle-route"
import { authMiddleware } from "@/src/lib/auth/middleware"
import corsConfig from "@/src/lib/cors.config"
import loggerConfig from "@/src/lib/logger.config"
import opentelemetryConfig from "@/src/lib/opentelemetry.config"
import swaggerConfig from "@/src/lib/swagger.config"
import cors from "@elysiajs/cors"
import { opentelemetry } from "@elysiajs/opentelemetry"
import swagger from "@elysiajs/swagger"
import { logger } from "@tqman/nice-logger"
import { Elysia, t } from "elysia"
import { wsHandler } from "@/src/api/ws"

export const app = new Elysia({
  serve: { hostname: Bun.env.HOSTNAME || "localhost" }
})
  .use(logger(loggerConfig))
  .use(swagger(swaggerConfig))
  .use(opentelemetry(opentelemetryConfig))
  .use(cors(corsConfig))
  .use(wsHandler)
  .get("/", () => "Hello Elysia! 🦊", {
    tags: ["guest"],
    detail: {
      summary: "/",
      description: "The main entry point of the API. Uses as test."
    },
    response: {
      200: t.String()
    }
  })
  .group(
    "/api/auth",
    {
      tags: ["guest"],
      detail: {
        description: "Handles authentication routes. Uses BetterAuth."
      }
    },
    (app) =>
      app
        .post("/sign-up/email", handleBetterAuthRoute, {
          detail: {
            description:
              "Use this route to get a token that will be used in cookies.",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      password: { type: "string" }
                    },
                    required: ["name", "email", "password"]
                  }
                }
              }
            },
            response: {
              200: t.Object({
                token: t.String(),
                user: t.Object({
                  id: t.String(),
                  name: t.String(),
                  email: t.String()
                })
              }),
              400: t.Object({
                code: t.String(),
                message: t.String()
              })
            }
          }
        })
        .post("/sign-in/email", handleBetterAuthRoute, {
          detail: {
            description:
              "Use this route to get a token that will be used in cookies.",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string" },
                      password: { type: "string" }
                    },
                    required: ["email", "password"]
                  }
                }
              }
            },
            response: {
              200: t.Object({
                token: t.String(),
                user: t.Object({
                  id: t.String(),
                  name: t.String(),
                  email: t.String()
                })
              }),
              400: t.Object({
                code: t.String(),
                message: t.String()
              })
            }
          }
        })
        .all("/*", handleBetterAuthRoute)
  )
  .guard(
    {
      // @ts-ignore
      beforeHandle: authMiddleware,
      detail: {
        tags: ["authenticated"]
      },
      response: {
        401: t.String({
          description: "Unauthorized"
        }),
        500: t.Any({})
      }
    },
    (app) =>
      app
        .get("/secured", () => "Secured 🔗🦊", {
          detail: {
            description: "Uses as test that auth is working."
          }
        })
        .use(userRoutes)
        .use(chatRoutes)
        .use(messageRoutes)
        .use(fileRoutes)
  )
  .get("/favicon.ico", () => Bun.file("../../docs/app/icon.png"))
  .listen(Bun.env.PORT || 3000)

export type App = typeof app

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
