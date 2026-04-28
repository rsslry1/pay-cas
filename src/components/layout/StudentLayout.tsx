'use client'

import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  Camera,
  Clock,
  LogOut,
  School,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import NotificationsPanel from '@/components/NotificationsPanel'

const navItems = [
  { id: 'student-dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'student-bills', label: 'Bills', icon: FileText },
  { id: 'student-upload', label: 'Upload', icon: Camera, isCenter: true },
  { id: 'student-history', label: 'History', icon: Clock },
]

function getStudentName(user: ReturnType<typeof useAppStore.getState>['currentUser']) {
  if (!user) return 'Student'
  if (user.name) return user.name
  if (user.studentProfile) {
    return `${user.studentProfile.firstName} ${user.studentProfile.lastName}`
  }
  return user.email
}

function getInitials(user: ReturnType<typeof useAppStore.getState>['currentUser']) {
  if (!user) return 'S'
  if (user.studentProfile) {
    const fp = user.studentProfile.firstName
    const lp = user.studentProfile.lastName
    return `${fp.charAt(0)}${lp.charAt(0)}`.toUpperCase()
  }
  return user.email?.charAt(0).toUpperCase() || 'S'
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { currentView, currentUser, logout } = useAppStore()

  const handleNav = useCallback((id: string) => {
    useAppStore.getState().setCurrentView(id)
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const studentName = getStudentName(currentUser)
  const initials = getInitials(currentUser)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shrink-0">
              <School className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{studentName}</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {currentUser?.studentProfile?.course && currentUser?.studentProfile.year
                  ? `${currentUser.studentProfile.course} - Year ${currentUser.studentProfile.year}`
                  : currentUser?.studentProfile?.studentId || ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsPanel />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 h-10 w-10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-end justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            const Icon = item.icon

            if (item.isCenter) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className="relative -top-4 flex flex-col items-center justify-center"
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
                      isActive
                        ? 'bg-emerald-600 scale-110 shadow-emerald-600/40'
                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] mt-1 font-medium transition-colors',
                      isActive ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="flex flex-col items-center justify-center py-2 px-3 min-w-[56px] min-h-[44px]"
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="student-nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-600"
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 font-medium transition-colors',
                    isActive ? 'text-emerald-600' : 'text-gray-400'
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* Safe area for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  )
}
