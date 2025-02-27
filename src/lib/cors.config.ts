import type cors from "@elysiajs/cors"

const allowedOrigins = [Bun.env.FRONTEND_URL!]

function validateOrigin(request: Request) {
  const origin = request.headers.get("origin") || ""
  return allowedOrigins.includes(origin)
}

export default {
  // origin: validateOrigin,
  // allowedHeaders: ["Content-Type", "Authorization"],
  // methods: ["POST", "GET", "OPTIONS", "PUT", "DELETE", "PATCH"],
  // exposeHeaders: ["Content-Length"],
  // maxAge: 600,
  // credentials: true
} satisfies Parameters<typeof cors>[0]
