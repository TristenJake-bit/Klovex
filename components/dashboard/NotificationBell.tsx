'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, CheckCheck, FileText, AlertTriangle, Calendar, TrendingUp, Mail } from 'lucide-react'
import Link from 'next/link'

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  ai_analysis: { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' },
  risk: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  deadline: { icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50' },
  status_change: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
  email: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50' },
  system: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' },
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {}
  }, [])

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const fmt = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      {/* Bell Button — positioned in mobile header and desktop sidebar area */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        className="fixed top-3.5 right-14 md:top-5 md:left-44 z-40 p-2 rounded-lg hover:bg-gray-100 transition-colors bg-white md:bg-transparent"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-14 right-4 md:top-16 md:left-14 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                  <p className="text-xs text-gray-300 mt-1">You&apos;ll see alerts for deadlines, AI analyses, and status changes here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n: any) => {
                    const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
                    const Icon = config.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.read) markRead(n.id) }}
                        className={`px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-brand-50/30' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'} line-clamp-1`}>{n.title}</p>
                              {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
                            </div>
                            {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                            <p className="text-xs text-gray-400 mt-1">{fmt(n.created_at)}</p>
                          </div>
                        </div>
                        {n.transaction_id && (
                          <Link href={`/dashboard/transactions/${n.transaction_id}`} onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                            className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1.5 ml-11 inline-block">
                            View transaction →
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
