import type { ElysiaWS } from "elysia/dist/ws"
import type { MessageResponse } from "@/src/api/messages/messages.api"

export type ChatSubscriptions = Map<string, Set<ElysiaWS>>

export const chatSubscriptions: ChatSubscriptions = new Map()

export function broadcastMessage(chatId: string, message: MessageResponse) {
  const subscribers = chatSubscriptions.get(chatId)
  if (!subscribers) return

  const payload = JSON.stringify({
    type: "new_message",
    chatId,
    message
  })

  for (const ws of subscribers) {
    ws.send(payload)
  }
}
