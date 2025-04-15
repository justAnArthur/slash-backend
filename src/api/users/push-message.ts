export async function sendPushNotification(
  expoPushToken: Pick<ExpoPushMessage, "to">["to"],
  _message: Omit<ExpoPushMessage, "to">
) {
  const message = _message as ExpoPushMessage
  message.to = expoPushToken

  return await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message)
  })
}

// ---
// copied from https://github.com/expo/expo-server-sdk-node/blob/main/src/ExpoClient.ts#L347
// see "Message request format" at https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format

export type ExpoPushToken = string

export type ExpoPushMessage = {
  to: ExpoPushToken | ExpoPushToken[]
  data?: Record<string, unknown>
  title?: string
  subtitle?: string
  body?: string
  sound?:
    | string
    | null
    | {
        critical?: boolean
        name?: string | null
        volume?: number
      }
  ttl?: number
  expiration?: number
  priority?: "default" | "normal" | "high"
  interruptionLevel?: "active" | "critical" | "passive" | "time-sensitive"
  badge?: number
  channelId?: string
  icon?: string
  richContent?: {
    image?: string
  }
  categoryId?: string
  mutableContent?: boolean
  _contentAvailable?: boolean
}
