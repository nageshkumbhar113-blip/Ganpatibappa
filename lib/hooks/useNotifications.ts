'use client'

import { useEffect, useState, useCallback } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase/client'

interface NotificationState {
  permission: NotificationPermission | 'default'
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
}

export function useNotifications(shopId: string | null): NotificationState {
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission)
    setIsSubscribed(Notification.permission === 'granted')
  }, [])

  // Listen for foreground messages and show browser notification
  useEffect(() => {
    if (!isSubscribed) return

    const unsubscribe = onForegroundMessage(({ title, body, url }) => {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          data: { url },
        })
      }
    })

    return unsubscribe
  }, [isSubscribed])

  const subscribe = useCallback(async () => {
    if (!shopId || isLoading) return
    setIsLoading(true)

    try {
      const token = await requestNotificationPermission(shopId)
      if (token) {
        setIsSubscribed(true)
        setPermission('granted')
      } else {
        setPermission(Notification.permission)
      }
    } catch (error) {
      console.error('[useNotifications] Subscribe failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [shopId, isLoading])

  return { permission, isSubscribed, isLoading, subscribe }
}
