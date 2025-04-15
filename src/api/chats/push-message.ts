import type { MessageResponse } from "@/src/api/messages/messages.api"
import {
  type PushMessage,
  sendPushNotification
} from "@/src/api/users/push-message"
import db from "@/src/db/connection"
import { chatUser } from "@/src/api/chats/chats.schema"
import { and, eq, isNotNull, ne } from "drizzle-orm"
import { device } from "@/src/api/users/users.schema"

function mapMessageToPushMessage(message: MessageResponse): PushMessage {
  return {
    title: message.name,
    body: message.content || ""
  }
}

export async function notifyChatUsers(
  chatId: string,
  senderId: string,
  message: MessageResponse
) {
  const pushMessage = mapMessageToPushMessage(message)

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
