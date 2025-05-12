import { chatUser } from "@/src/api/chats/chats.schema"
import { db } from "@/src/db/connection"
import { chatSubscriptions, userWebSockets } from "@/src/api/chats/chats.state"
import { eq } from "drizzle-orm"
import Elysia from "elysia"

export const wsHandler = new Elysia().ws("/ws", {
  async open(ws) {
    try {
      const userId = ws.data.query.id
      const userChats = await db
        .select({ chatId: chatUser.chatId })
        .from(chatUser)
        .where(eq(chatUser.userId, userId))

      for (const { chatId } of userChats) {
        if (!chatSubscriptions.has(chatId)) {
          chatSubscriptions.set(chatId, new Set())
        }
        chatSubscriptions.get(chatId)?.add(ws)
      }

      if (!userWebSockets.has(userId)) {
        userWebSockets.set(userId, new Set())
      }
      userWebSockets.get(userId)!.add(ws)

      ws.subscribe("heartbeat")
      ws.send(JSON.stringify({ type: "connected" }))
    } catch (error) {
      ws.close()
    }
  },
  close(ws) {
    // @ts-ignore
    const userId = ws.data.query.id
    userWebSockets.get(userId)?.delete(ws)
    if (userWebSockets.get(userId)?.size === 0) {
      userWebSockets.delete(userId)
    }

    for (const [chatId, subs] of chatSubscriptions) {
      if (subs.has(ws)) {
        subs.delete(ws)
        if (subs.size === 0) {
          chatSubscriptions.delete(chatId)
        }
      }
    }
    ws.unsubscribe("heartbeat")
  },
  message(ws, message) {
    if (message === "ping") {
      ws.send("pong")
    } else {
      console.log(message)
    }
  }
})
