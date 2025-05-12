import { insertFile } from "@/src/api/file/files.api"
import { device, user } from "@/src/api/users/users.schema"
import db from "@/src/db/connection"
import { checkAndGetSession } from "@/src/lib/auth"
import { and, eq, isNotNull, like, ne, sql } from "drizzle-orm"
import Elysia, { type Context, t } from "elysia"
import { sendPushNotification } from "@/src/api/users/push-message"

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
      })
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

      if (!userToReturn) throw error(404, "USER_NOT_FOUND")

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

      // biome-ignore lint/suspicious/noImplicitAnyLet: -
      let file

      if (image) {
        const MAX_SIZE = 1_048_576

        if (image.size > MAX_SIZE) throw error(400, "IMAGE_MAX_SIZE_1MB_LIMIT")

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

      const [userProfile] = await db
        .select({ image: user.image, bio: user.bio })
        .from(user)
        .where(eq(user.id, id))

      if (!userProfile) throw error(404, "USER_NOT_FOUND")

      return {
        image: userProfile.image || null,
        bio: userProfile.bio || null
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
  .put(
    "/device",
    async ({ request, body }) => {
      const session = await checkAndGetSession(request.headers)
      const userId = session.user.id

      const [existingDevice] = await db
        .select({ id: device.id })
        .from(device)
        .where(
          and(eq(device.pushToken, body.pushToken), eq(device.userId, userId))
        )
        .limit(1)

      if (existingDevice) return { deviceId: existingDevice.id }

      const [newDevice] = await db
        .insert(device)
        .values({
          userId,
          ...body
        })
        .returning({ id: device.id })

      return { deviceId: newDevice.id }
    },
    {
      detail: {
        description: "Set up push notification token for a user."
      },
      body: t.Object({
        pushToken: t.String({ required: true }),
        brand: t.String({ required: false }),
        model: t.String({ required: false }),
        osName: t.String({ required: false }),
        osVersion: t.String({ required: false }),
        deviceName: t.String({ required: false }),
        deviceYear: t.String({ required: false })
      })
    }
  )
  .get("/push-check", async () => {
    const devices = await db
      .select({ pushToken: device.pushToken })
      .from(device)
      .where(and(isNotNull(device.pushToken), ne(device.pushToken, "")))

    const pushTokens = devices.map((device) => device.pushToken)

    await sendPushNotification(pushTokens, {
      sound: "default",
      title: "Original Title",
      body: `And here is the body! Timestamp: ${new Date().toISOString()}`,
      data: { someData: "goes here" }
    })
  })
