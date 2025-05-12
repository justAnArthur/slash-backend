import type { MessageResponse } from "@/src/api/messages/messages.api"
import type { ChatListResponse } from "@/src/api/chats/chats.api" // Import ChatListResponse
import type { ElysiaWS, WSContext } from "elysia" // Ensure ElysiaWS type is imported
import { ExpoPushMessage, type PushMessage } from "@/src/api/users/push-message"

// Define ElysiaWS type for WebSocket context
interface WebSocketData {
  query: { id: string } // User ID from query parameter
}

export type ChatSubscriptions = Map<string, Set<ElysiaWS<WebSocketData>>>

export const chatSubscriptions: ChatSubscriptions = new Map()
export const userWebSockets: Map<
  string,
  Set<ElysiaWS<WebSocketData>>
> = new Map()

// Broadcast a new message to all subscribers of a chat
export function broadcastMessage(chatId: string, message: MessageResponse) {
  const subscribers = chatSubscriptions.get(chatId)
  console.log(subscribers)
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

// Subscribe users to a chat
export function subscribeUsersToChat(chatId: string, userIds: string[]) {
  if (!chatSubscriptions.has(chatId)) {
    chatSubscriptions.set(chatId, new Set())
  }

  const chatSubscribers = chatSubscriptions.get(chatId)!

  for (const userId of userIds) {
    const userSockets = userWebSockets.get(userId)
    if (userSockets) {
      for (const ws of userSockets) {
        chatSubscribers.add(ws)
      }
    }
  }
}

// Unsubscribe a user from a chat
export function unsubscribeUserFromChat(chatId: string, userId: string) {
  const subscribers = chatSubscriptions.get(chatId)
  if (!subscribers) return

  for (const ws of subscribers) {
    if (ws.data.query.id === userId) {
      subscribers.delete(ws)
      break
    }
  }

  if (subscribers.size === 0) {
    chatSubscriptions.delete(chatId)
  }
}

// Unsubscribe all users from a chat and notify them
export function unsubscribeAllFromChat(chatId: string) {
  const subscribers = chatSubscriptions.get(chatId)
  if (!subscribers) return

  const payload = JSON.stringify({
    type: "delete_chat",
    chatId
  })

  for (const ws of subscribers) {
    ws.send(payload)
  }
  chatSubscriptions.delete(chatId)
}

// Initialize WebSocket connection for a user
export function initializeUserSubscription(
  ws: ElysiaWS<WebSocketData>,
  chatIds: string[]
) {
  const userId = ws.data.query.id

  // Subscribe the WebSocket connection to all relevant chats
  for (const chatId of chatIds) {
    if (!chatSubscriptions.has(chatId)) {
      chatSubscriptions.set(chatId, new Set())
    }
    chatSubscriptions.get(chatId)!.add(ws)
  }
}
