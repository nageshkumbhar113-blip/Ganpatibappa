import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK once (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const firebaseAdmin = admin

/** Send a push notification to a single FCM token. */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
        fcmOptions: {
          link: data?.url ?? '/',
        },
      },
    })
    return true
  } catch (error: any) {
    if (error?.code === 'messaging/registration-token-not-registered') {
      return false // Token is invalid/expired
    }
    console.error('[sendPushNotification]', error)
    return false
  }
}

/** Send push notifications to multiple FCM tokens. Returns count of successful sends. */
export async function sendBulkPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { successCount: 0, failureCount: 0, invalidTokens: [] }

  const MAX_PER_BATCH = 500
  let successCount = 0
  let failureCount = 0
  const invalidTokens: string[] = []

  // Firebase allows max 500 per multicast
  for (let i = 0; i < tokens.length; i += MAX_PER_BATCH) {
    const batch = tokens.slice(i, i + MAX_PER_BATCH)

    const result = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
        },
        fcmOptions: { link: data?.url ?? '/' },
      },
    })

    successCount += result.successCount
    failureCount += result.failureCount

    result.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(batch[idx])
      }
    })
  }

  return { successCount, failureCount, invalidTokens }
}
