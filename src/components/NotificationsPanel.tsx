'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { notifications as notifApi } from '@/lib/api'
import { Bell, Check, CheckCheck, Info, AlertTriangle, XCircle, CreditCard, FileText } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

function getNotifIcon(type: string) {
  switch (type) {
    case 'payment':
      return <CreditCard className="w-4 h-4 text-emerald-600" />
    case 'billing':
      return <FileText className="w-4 h-4 text-blue-600" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-600" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-600" />
    default:
      return <Info className="w-4 h-4 text-gray-600" />
  }
}

export default function NotificationsPanel() {
  const { notifications, unreadCount, fetchNotifications } = useAppStore()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useAutoRefresh(fetchNotifications, { intervalMs: 10000 })

  const handleMarkRead = async (id: string) => {
    try {
      await notifApi.markRead(id)
      fetchNotifications()
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notifApi.markAllRead()
      fetchNotifications()
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-emerald-50/50' : ''
                  }`}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                >
                  <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.read ? 'font-medium' : 'text-gray-600'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkRead(notif.id)
                      }}
                      className="shrink-0 mt-0.5 text-gray-400 hover:text-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
