import * as admin from 'firebase-admin'

function getFirebaseAdmin() {
  if (admin.apps.length) return admin

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })

  return admin
}

export const firebaseAdmin = admin

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const app = getFirebaseAdmin()
    if (!app) return false

    await app.messaging().send({
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
        fcmOptions: { link: data?.url ?? '/' },
      },
    })
    return true
  } catch (error: any) {
    if (error?.code === 'messaging/registration-token-not-registered') return false
    console.error('[sendPushNotification]', error)
    return false
  }
}

export async function sendBulkPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { successCount: 0, failureCount: 0, invalidTokens: [] }

  const app = getFirebaseAdmin()
  if (!app) return { successCount: 0, failureCount: tokens.length, invalidTokens: [] }

  const MAX_PER_BATCH = 500
  let successCount = 0
  let failureCount = 0
  const invalidTokens: string[] = []

  for (let i = 0; i < tokens.length; i += MAX_PER_BATCH) {
    const batch = tokens.slice(i, i + MAX_PER_BATCH)

    const result = await app.messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: { title, body, icon: '/icons/icon-192x192.png' },
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
