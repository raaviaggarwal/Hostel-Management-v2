import { useState, useCallback, useMemo } from 'react'
import { resourceApi } from '../api/client'
import { NotificationsContext } from './notifications'

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const setNotifications = useCallback((list) => {
    setItems(list)
    setUnreadCount(list.filter((item) => !item.read).length)
  }, [])

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
    try {
      const list = await resourceApi.get('/notifications')
      setItems(list)
      setUnreadCount(list.filter((item) => !item.read).length)
    } catch {
      // notifications are optional during the mock phase
    }
  }, [])

  const value = useMemo(
    () => ({ items, unreadCount, setNotifications, refresh, addNotification, markAllRead, markRead }),
    [items, unreadCount, setNotifications, refresh, addNotification, markAllRead, markRead]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
