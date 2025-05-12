import { chatUser } from "@/src/api/chats/chats.schema"
import type { MessageResponse } from "@/src/api/messages/messages.api"
import {
  type PushMessage,
  sendPushNotification
} from "@/src/api/users/push-message"
import { device } from "@/src/api/users/users.schema"
import db from "@/src/db/connection"
import { and, eq, isNotNull, ne } from "drizzle-orm"

function mapMessageToPushMessage(message: MessageResponse): PushMessage {
  return {
    title: message.name,
    body: message.content || ""
  }
}

export async function notifyChatUsers(
  chatId: string,
  senderId: string,
  message: MessageResponse | PushMessage
) {
  const [chatUserEntity] = await db
    .select({ muted: chatUser.muted })
    .from(chatUser)
    .where(and(eq(chatUser.chatId, chatId), eq(chatUser.userId, senderId)))

  if (chatUserEntity.muted) return

  const pushMessage =
    "id" in message ? mapMessageToPushMessage(message) : message

  const pushTokens = await db
    .select({ pushToken: device.pushToken })
    .from(device)
    .innerJoin(chatUser, eq(chatUser.userId, device.userId))
    .where(
      and(
        eq(chatUser.chatId, chatId),
        ne(chatUser.userId, senderId),
        isNotNull(device.pushToken)
      )
    )
    .then((result) => result.map(({ pushToken }) => pushToken))

  if (pushTokens.length < 1) return

  return await sendPushNotification(pushTokens, pushMessage)
}
