import db from "@/src/db/connection"
import { insertFile } from "@/src/api/file/files.api"
import { user } from "@/src/db/schema.auth"
import { checkAndGetSession } from "@/src/lib/auth"
import { and, eq, like, ne, sql } from "drizzle-orm"
import type { Context } from "elysia"
import Elysia from "elysia"

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
    }
  )
  .get(
    "/:id",
    async ({
      params,
      error
    }: { params: { id: string }; error: Context["error"] }) => {
      const { id } = params
      try {
        const [userToReturn] = await db
          .select({ id: user.id, name: user.name, image: user.image })
          .from(user)
          .where(eq(user.id, id))

        if (!userToReturn) {
          return error(404, "User not found")
        }
        return userToReturn
      } catch (err) {
        console.error("Error fetching user:", err)
        return error(500, "Internal server error")
      }
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
    }
  )
