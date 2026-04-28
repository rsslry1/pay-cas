'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  School,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import NotificationsPanel from '@/components/NotificationsPanel'
import { cn } from '@/lib/utils'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'billings', label: 'Billings', icon: FileText },
  { id: 'receipts', label: 'Receipts', icon: Receipt },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function SidebarNav({
  collapsed,
  onNavigate,
  onCloseMobile,
}: {
  collapsed: boolean
  onNavigate: () => void
  onCloseMobile?: () => void
}) {
  const { currentView, currentUser, logout } = useAppStore()

  const handleNav = (id: string) => {
    useAppStore.getState().setCurrentView(id)
    onNavigate()
    onCloseMobile?.()
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center gap-3 px-4 h-16 shrink-0', collapsed && 'justify-center px-2')}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white shrink-0">
          <School className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-sidebar-foreground truncate">Billing System</h2>
            <p className="text-[10px] text-sidebar-foreground/60">Admin Panel</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id
          const Icon = item.icon
          const btn = (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-emerald-400')} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
          if (collapsed) {
            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }
          return btn
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className={cn('p-3 shrink-0', collapsed && 'px-1')}>
        {currentUser && (
          <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'px-2')}>
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                {currentUser.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.email}</p>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-500/20 text-emerald-300 border-0">
                  {currentUser.role}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen, currentUser, logout, currentView } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const viewLabel = navItems.find((i) => i.id === currentView)?.label || 'Dashboard'

  return (
    <div className="flex flex-col min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-sidebar transition-all duration-300 border-r border-sidebar-border',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        <SidebarNav collapsed={collapsed} onNavigate={() => {}} />
        <div className="absolute -right-3 top-20">
          <Button
            variant="outline"
            size="icon"
            className="w-6 h-6 rounded-full bg-white border-gray-300 shadow-sm hover:bg-gray-50"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('w-3 h-3 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className={cn('flex flex-col flex-1 transition-all duration-300', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/80 h-16 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          {/* Mobile menu button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarNav collapsed={false} onNavigate={() => {}} onCloseMobile={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-semibold text-gray-900">{viewLabel}</h1>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <NotificationsPanel />

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                  {currentUser?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700 font-medium max-w-[140px] truncate">
                {currentUser?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200/80 bg-white px-6 py-3 text-center text-xs text-gray-400 shrink-0">
          &copy; {new Date().getFullYear()} School Billing & Ledger System &middot; All rights reserved
        </footer>
      </div>
    </div>
  )
}
