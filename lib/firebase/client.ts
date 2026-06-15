'use client'

import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let messaging: Messaging | null = null

function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null
  if (!messaging) {
    try {
      messaging = getMessaging(app)
    } catch (e) {
      console.warn('[Firebase] Messaging not available:', e)
      return null
    }
  }
  return messaging
}

/** Request notification permission and get FCM token. */
export async function requestNotificationPermission(
  shopId: string
): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const msg = getFirebaseMessaging()
    if (!msg) return null

    const token = await getToken(msg, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    })

    if (!token) return null

    // Register token with our API
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcmToken: token, shopId, role: 'customer' }),
    })

    return token
  } catch (error) {
    console.error('[Firebase] Permission request failed:', error)
    return null
  }
}

/** Listen for foreground push messages. */
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; url?: string }) => void
) {
  const msg = getFirebaseMessaging()
  if (!msg) return () => {}

  return onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title ?? 'GanpatiBappa',
      body: payload.notification?.body ?? '',
      url: payload.data?.url,
    })
  })
}
