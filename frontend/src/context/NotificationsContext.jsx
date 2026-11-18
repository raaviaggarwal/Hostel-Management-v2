import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { resourceApi } from '../api/client'
import { useAuth } from './auth'
import { NotificationsContext } from './notifications'

const POLL_INTERVAL = 30000

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadedForToken, setLoadedForToken] = useState(null)
  const { isAuthenticated, token, logout } = useAuth()
  const requestId = useRef(0)

  const setNotifications = useCallback((list) => {
    setItems(list)
    setUnreadCount(list.filter((item) => !item.read).length)
    setLoadedForToken(token)
  }, [token])

  const addNotification = useCallback((item) => {
    setItems((prev) => [item, ...prev])
    setUnreadCount((count) => count + 1)
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })))
    setUnreadCount(0)
  }, [])

  const markRead = useCallback((id) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      setUnreadCount(next.filter((item) => !item.read).length)
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!isAuthenticated || !token) return

    try {
      const list = await resourceApi.get('/notifications')
      if (requestId.current === currentRequestId) setNotifications(list)
    } catch (error) {
      if (requestId.current !== currentRequestId) return
      if (error?.status === 401) {
        logout()
        return
      }
      console.error('Unable to load notifications:', error)
    }
  }, [isAuthenticated, token, logout, setNotifications])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      requestId.current += 1
      return undefined
    }

    let active = true
    const scheduleRefresh = () => {
      queueMicrotask(() => {
        if (active) refresh()
      })
    }

    scheduleRefresh()
    const interval = setInterval(scheduleRefresh, POLL_INTERVAL)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleFocus)
      requestId.current += 1
    }
  }, [refresh, isAuthenticated, token, setNotifications])

  const value = useMemo(
    () => ({
      items: isAuthenticated && loadedForToken === token ? items : [],
      unreadCount: isAuthenticated && loadedForToken === token ? unreadCount : 0,
      setNotifications,
      refresh,
      addNotification,
      markAllRead,
      markRead,
    }),
    [
      isAuthenticated,
      token,
      loadedForToken,
      items,
      unreadCount,
      setNotifications,
      refresh,
      addNotification,
      markAllRead,
      markRead,
    ]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
