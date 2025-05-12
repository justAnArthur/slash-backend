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
import { Elysia, file } from "elysia"
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
        tags: ["authenticated"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {}
            }
          },
          401: {
            description: "Unauthorized",
            content: {
              "text/plain": {
                schema: {
                  type: "string"
                }
              }
            }
          },
          422: {
            description: "Unprocessable Entity",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    errors: {
                      type: "array",
                      items: {
                        type: "object"
                      }
                    }
                  }
                }
              }
            }
          },
          500: {
            description: "Internal Server Error",
            content: {
              "text/plain": {
                schema: {
                  type: "string"
                }
              }
            }
          }
        }
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
  .get("/favicon.ico", () => file("../../docs/app/icon.png"))
  .listen(Bun.env.PORT || 3000)

export type App = typeof app

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
