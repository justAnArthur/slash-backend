import { insertFile } from "@/src/api/file/files.api"
import { user } from "@/src/api/users/users.schema"
import db from "@/src/db/connection"
import { checkAndGetSession } from "@/src/lib/auth"
import { and, eq, like, ne, sql } from "drizzle-orm"
import Elysia, { type Context, t } from "elysia"

export default new Elysia({ prefix: "/users" })
  .get(
    "/search",
    async ({
      query,
      request
    }: {
      query: { q: string; page: number; pageSize: number }
      request: Context["request"]
    }) => {
      const session = await checkAndGetSession(request.headers)

      const currentUserId = session.user.id

      const { q, page = 1, pageSize = 5 } = query
      const offset = (Number(page) - 1) * pageSize

      return db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
          email: user.email
        })
        .from(user)
        .where(
          and(
            // @ts-ignore
            like(sql`lower(${user.name})`, `%${q.toLowerCase()}%`),
            ne(user.id, currentUserId)
          )
        )
        .limit(pageSize)
        .offset(offset)
    },
    {
      detail: {
        description:
          "Search for users by name. Returns a paginated list of users."
      },
      query: t.Object({
        q: t.String({ required: true }),
        page: t.Number({ required: false }),
        pageSize: t.Number({ required: false })
      }),
      response: {
        200: t.Array(
          t.Object({
            id: t.String(),
            name: t.String(),
            image: t.Nullable(t.String()),
            email: t.String()
          })
        )
      }
    }
  )
  .get(
    "/:id",
    async ({
      params,
      error,
      request
    }: {
      params: { id: string }
      error: Context["error"]
      request: Context["request"]
    }) => {
      await checkAndGetSession(request.headers)
      const { id } = params

      const [userToReturn] = await db
        .select({ id: user.id, name: user.name, image: user.image })
        .from(user)
        .where(eq(user.id, id))

      if (!userToReturn) throw new Error("Unauthorized")

      return userToReturn
    },
    {
      detail: {
        description: "Get user by ID."
      },
      params: t.Object({
        id: t.String({ required: true })
      })
    }
  )
  .post(
    "/profile",
    async ({
      body,
      request,
      error
    }: {
      body: { image?: File; bio?: string }
      request: Context["request"]
      error: Context["error"]
    }) => {
      const session = await checkAndGetSession(request.headers)
      const { image, bio } = body

      try {
        // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
        let file

        if (image) {
          const MAX_SIZE = 1_048_576
          if (image.size > MAX_SIZE) {
            return error(400, "Image size exceeds 1MB limit")
          }
          file = await insertFile(image)
        }

        const updatedUser = await db
          .update(user)
          .set({
            bio: bio || sql`bio`,
            image: file?.id || sql`image`,
            updatedAt: new Date()
          })
          .where(eq(user.id, session.user.id))
          .returning({
            id: user.id,
            name: user.name,
            image: user.image,
            bio: user.bio
          })

        return {
          message: "User info updated successfully",
          user: updatedUser
        }
      } catch (err) {
        console.error("Error updating profile:", err)
        return error(500, "Internal server error")
      }
    },
    {
      detail: {
        description: "Update user profile information.",
        tags: ["file"]
      },
      body: t.Object({
        image: t.Any(),
        bio: t.Optional(t.String())
      })
    }
  )
  .get(
    "/:id/profile",
    async ({
      params,
      error
    }: { params: { id: string }; error: Context["error"] }) => {
      const { id } = params
      try {
        const [userProfile] = await db
          .select({ image: user.image, bio: user.bio })
          .from(user)
          .where(eq(user.id, id))

        if (!userProfile) {
          return error(404, "User not found")
        }

        return {
          image: userProfile.image || null,
          bio: userProfile.bio || null
        }
      } catch (err) {
        console.error("Error fetching user profile:", err)
        return error(500, "Internal server error")
      }
    },
    {
      detail: {
        description: "Get user profile information by ID."
      },
      params: t.Object({
        id: t.String({ required: true })
      })
    }
  )
